-- ============================================================
-- CARPENTO — Fusiona clientes duplicados existentes
-- ============================================================
-- El flujo de "convertir lead en cotización" creaba un cliente nuevo
-- cada vez que se repetía la conversión del mismo lead (ver fix en
-- QuoteForm.jsx), dejando varios clientes idénticos por teléfono.
-- Esta migración limpia lo que ya quedó duplicado en producción:
-- agrupa clientes del mismo taller (owner_id) con el mismo teléfono,
-- conserva el más antiguo (primer created_at) y reasigna hacia él
-- todo lo que apuntaba a los duplicados (leads, quotes, sales) antes
-- de borrarlos. No toca clientes con teléfono vacío/nulo.
--
-- Ejecutar en Supabase SQL Editor. Es seguro correr más de una vez
-- (si no hay duplicados, no hace nada).

do $$
declare
  grp record;
  keep_id uuid;
  dup_ids uuid[];
begin
  for grp in
    select owner_id, regexp_replace(phone, '\D', '', 'g') as norm_phone
    from public.clients
    where phone is not null and regexp_replace(phone, '\D', '', 'g') <> ''
    group by owner_id, regexp_replace(phone, '\D', '', 'g')
    having count(*) > 1
  loop
    -- cliente a conservar: el más antiguo del grupo
    select id into keep_id
    from public.clients
    where owner_id = grp.owner_id
      and regexp_replace(phone, '\D', '', 'g') = grp.norm_phone
    order by created_at asc
    limit 1;

    -- resto de duplicados del grupo
    select array_agg(id) into dup_ids
    from public.clients
    where owner_id = grp.owner_id
      and regexp_replace(phone, '\D', '', 'g') = grp.norm_phone
      and id <> keep_id;

    if dup_ids is not null then
      update public.leads  set client_id = keep_id where client_id = any(dup_ids);
      update public.quotes set client_id = keep_id where client_id = any(dup_ids);
      update public.sales  set client_id = keep_id where client_id = any(dup_ids);

      delete from public.clients where id = any(dup_ids);
    end if;
  end loop;
end $$;
