-- ============================================================
-- CARPENTO — Desactivar el optimizador de cortes por taller
-- ============================================================
-- can_optimizer en plan_config es un flag GLOBAL del plan (afecta a
-- todos los talleres Pro). Algunos rubros (PVC, drywall en perfiles)
-- no lo necesitan aunque tengan plan Pro por otras razones — esta
-- columna permite ocultarlo puntualmente sin degradar el resto del
-- plan ni afectar a otros talleres.
--
-- Ejecutar en Supabase SQL Editor.

alter table public.shop_config
  add column if not exists optimizer_disabled boolean not null default false;

-- ============================================================
-- Reemplaza get_superadmin_metrics para incluir optimizer_disabled
-- en shops_list (Super Admin necesita verlo y poder cambiarlo).
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
          sc.optimizer_disabled,
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
