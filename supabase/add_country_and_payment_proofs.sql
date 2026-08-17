-- ============================================================
-- CARPENTO — País del taller + comprobantes de pago manual
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- País elegido en el registro (determina moneda y método de pago)
alter table public.shop_config
  add column if not exists country text not null default 'CL';

-- Comprobantes de pago manual (países sin Mercado Pago, ej. Venezuela)
create table if not exists public.payment_proofs (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  plan         text not null default 'pro',
  amount       numeric(12,2) not null,
  currency     text not null default 'USD',
  method       text not null default 'other', -- 'usdt' | 'zelle' | 'binance' | 'pago_movil' | 'other'
  reference    text default '',                -- número de referencia / hash de transacción
  proof_url    text,                           -- captura del comprobante (storage)
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamptz,
  notes        text default '',
  created_at   timestamptz default now()
);

alter table public.payment_proofs enable row level security;

-- El dueño puede crear e leer sus propios comprobantes
create policy "payment_proofs owner insert" on public.payment_proofs
  for insert with check (auth.uid() = owner_id);
create policy "payment_proofs owner read" on public.payment_proofs
  for select using (auth.uid() = owner_id);

-- Solo service_role (backend / super admin RPC) puede aprobar o rechazar
create policy "payment_proofs service_write" on public.payment_proofs
  for update using (auth.role() = 'service_role');

-- Storage bucket para comprobantes
insert into storage.buckets (id, name, public)
  values ('payment-proofs', 'payment-proofs', false)
  on conflict (id) do nothing;

create policy "payment proofs owner upload" on storage.objects
  for insert with check (bucket_id = 'payment-proofs' and auth.uid() is not null);

create policy "payment proofs owner read" on storage.objects
  for select using (bucket_id = 'payment-proofs' and auth.uid() is not null);

-- ============================================================
-- Reemplaza get_superadmin_metrics para incluir owner_id, country
-- y el conteo de comprobantes pendientes de revisión.
-- ============================================================
create or replace function public.get_superadmin_metrics()
returns json language plpgsql security definer as $$
declare
  result json;
begin
  select json_build_object(
    'total_shops',      (select count(*) from public.shop_config),
    'pro_shops',        (select count(*) from public.subscriptions where plan = 'pro' and status = 'active'),
    'free_shops',       (select count(*) from public.subscriptions where plan = 'free'),
    'trialing_shops',   (select count(*) from public.subscriptions where status = 'trialing'),
    'total_leads',      (select count(*) from public.catalog_leads),
    'total_quotes',     (select count(*) from public.quotes),
    'total_revenue',    (select coalesce(sum(amount),0) from public.sales where payment_status = 'paid'),
    'new_shops_7d',     (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'pending_proofs',   (select count(*) from public.payment_proofs where status = 'pending'),
    'shops_list', (
      select json_agg(row_to_json(t)) from (
        select
          sc.owner_id,
          sc.shop_name,
          sc.slug,
          sc.country,
          sub.status as sub_status,
          sub.plan   as sub_plan,
          sub.trial_ends_at,
          u.email,
          u.created_at,
          (select count(*) from public.catalog_products cp where cp.owner_id = sc.owner_id) as products_count,
          (select count(*) from public.catalog_leads   cl where cl.owner_id = sc.owner_id) as leads_count,
          (select count(*) from public.quotes          q  where q.owner_id  = sc.owner_id) as quotes_count
        from public.shop_config sc
        join auth.users u on u.id = sc.owner_id
        left join public.subscriptions sub on sub.owner_id = sc.owner_id
        order by u.created_at desc
        limit 200
      ) t
    ),
    'pending_proofs_list', (
      select coalesce(json_agg(row_to_json(p)), '[]'::json) from (
        select
          pp.id, pp.owner_id, pp.plan, pp.amount, pp.currency, pp.method,
          pp.reference, pp.proof_url, pp.status, pp.created_at,
          sc.shop_name, u.email
        from public.payment_proofs pp
        join auth.users u on u.id = pp.owner_id
        left join public.shop_config sc on sc.owner_id = pp.owner_id
        where pp.status = 'pending'
        order by pp.created_at asc
      ) p
    )
  ) into result;
  return result;
end;
$$;

-- ============================================================
-- RPC para aprobar/rechazar un comprobante (solo super admin la llama)
-- Al aprobar, activa el plan indicado inmediatamente.
-- ============================================================
create or replace function public.review_payment_proof(
  proof_id uuid,
  approve  boolean,
  admin_notes text default ''
)
returns void language plpgsql security definer as $$
declare
  proof record;
begin
  select * into proof from public.payment_proofs where id = proof_id;
  if not found then
    raise exception 'Comprobante no encontrado';
  end if;

  update public.payment_proofs
  set status      = case when approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      notes       = admin_notes
  where id = proof_id;

  if approve then
    update public.subscriptions
    set plan = proof.plan,
        status = 'active',
        updated_at = now()
    where owner_id = proof.owner_id;
  end if;
end;
$$;
