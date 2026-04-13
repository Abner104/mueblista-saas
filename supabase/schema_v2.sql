-- ============================================================
-- CARPENTO — Schema v2
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. WORKERS (equipo del taller) ──────────────────────────
create table if not exists public.workers (
  id            bigserial primary key,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  invited_user_id uuid references auth.users(id) on delete set null,
  name          text not null,
  role          text not null default 'maestro carpintero',
  worker_role   text not null default 'maestro' check (worker_role in ('maestro','vendedor','admin')),
  status        text not null default 'active' check (status in ('active','inactive','vacation')),
  commission_pct numeric(5,2) default 0,
  phone         text,
  email         text,
  notes         text,
  created_at    timestamptz default now()
);
alter table public.workers enable row level security;
create policy "workers_owner" on public.workers
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── 2. CATALOG_COLLECTIONS (trabajos realizados) ────────────
create table if not exists public.catalog_collections (
  id          bigserial primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text not null default '',
  description text default '',
  photos      jsonb default '[]'::jsonb,
  sort_order  int default 0,
  created_at  timestamptz default now()
);
alter table public.catalog_collections enable row level security;
create policy "collections_owner" on public.catalog_collections
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
-- Lectura pública (para el catálogo)
create policy "collections_public_read" on public.catalog_collections
  for select using (true);

-- ── 3. SUBSCRIPTIONS (suscripciones MP) ─────────────────────
create table if not exists public.subscriptions (
  id                bigserial primary key,
  owner_id          uuid not null unique references auth.users(id) on delete cascade,
  plan              text not null default 'free' check (plan in ('free','pro','enterprise')),
  status            text not null default 'active' check (status in ('active','trialing','past_due','canceled','paused')),
  mp_subscription_id text,          -- ID de suscripción en MercadoPago
  mp_payer_id       text,           -- ID del pagador en MP
  mp_external_ref   text unique,    -- referencia externa (owner_id + timestamp)
  current_period_start timestamptz,
  current_period_end   timestamptz,
  trial_ends_at     timestamptz default (now() + interval '14 days'),
  canceled_at       timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
alter table public.subscriptions enable row level security;
-- El dueño ve su propia suscripción
create policy "sub_owner_read" on public.subscriptions
  for select using (owner_id = auth.uid());
-- Solo el backend (service_role) puede escribir
create policy "sub_service_write" on public.subscriptions
  for all using (auth.role() = 'service_role');

-- ── 4. SUPER_ADMIN_USERS ─────────────────────────────────────
create table if not exists public.super_admin_users (
  id         bigserial primary key,
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz default now()
);
alter table public.super_admin_users enable row level security;
-- Solo service_role puede leer/escribir esta tabla
create policy "superadmin_service_only" on public.super_admin_users
  using (auth.role() = 'service_role');

-- ── 5. Agregar columnas a shop_config ────────────────────────
alter table public.shop_config
  add column if not exists plan         text default 'free',
  add column if not exists whatsapp     text,
  add column if not exists logo_url     text,
  add column if not exists stats        jsonb default '[
    {"label":"Proyectos entregados","value":"120+"},
    {"label":"Clientes satisfechos","value":"98%"},
    {"label":"Años de trayectoria","value":"5"},
    {"label":"Respuesta cotización","value":"24h"}
  ]'::jsonb,
  add column if not exists guarantees   jsonb default '["Sin adelanto","Instalación incluida","Garantía 12 meses","Corte CNC de precisión"]'::jsonb,
  add column if not exists tagline      text,
  add column if not exists accent_color text default '#c8923a',
  add column if not exists address      text;

-- ── 6. Agregar columnas a quotes ─────────────────────────────
alter table public.quotes
  add column if not exists seller_worker_id bigint references public.workers(id) on delete set null;

-- ── 7. Agregar columnas a sales ──────────────────────────────
alter table public.sales
  add column if not exists assigned_worker_id bigint references public.workers(id) on delete set null,
  add column if not exists seller_worker_id   bigint references public.workers(id) on delete set null;

-- ── 8. ONBOARDING_PROGRESS (wizard post-registro) ────────────
create table if not exists public.onboarding_progress (
  id          bigserial primary key,
  owner_id    uuid not null unique references auth.users(id) on delete cascade,
  step        int not null default 0,   -- 0=no iniciado, 3=completo
  completed   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.onboarding_progress enable row level security;
create policy "onboarding_owner" on public.onboarding_progress
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── 9. PLAN_LIMITS view (para chequear límites fácil) ────────
create or replace view public.plan_limits as
select
  s.owner_id,
  s.plan,
  s.status,
  s.trial_ends_at,
  case
    when s.plan = 'pro'        then true
    when s.plan = 'enterprise' then true
    when s.status = 'trialing' and s.trial_ends_at > now() then true
    else false
  end as is_pro,
  case s.plan
    when 'free'       then 10
    when 'pro'        then 999999
    when 'enterprise' then 999999
    else 10
  end as max_products,
  case s.plan
    when 'free'       then 20
    when 'pro'        then 999999
    when 'enterprise' then 999999
    else 20
  end as max_clients,
  case s.plan
    when 'free'       then false
    when 'pro'        then true
    when 'enterprise' then true
    else false
  end as can_use_optimizer,
  case s.plan
    when 'free'       then false
    when 'pro'        then true
    when 'enterprise' then true
    else false
  end as can_use_workers
from public.subscriptions s;

-- ── 10. Función para crear suscripción free automáticamente ──
create or replace function public.handle_new_user_subscription()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (owner_id, plan, status)
  values (new.id, 'free', 'trialing')
  on conflict (owner_id) do nothing;

  insert into public.onboarding_progress (owner_id, step, completed)
  values (new.id, 0, false)
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

-- Trigger: cuando se crea un nuevo usuario
drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute procedure public.handle_new_user_subscription();

-- ── 11. Función para métricas del super-admin ────────────────
create or replace function public.get_superadmin_metrics()
returns json language plpgsql security definer as $$
declare
  result json;
begin
  select json_build_object(
    'total_shops',    (select count(*) from public.shop_config),
    'pro_shops',      (select count(*) from public.subscriptions where plan = 'pro' and status = 'active'),
    'free_shops',     (select count(*) from public.subscriptions where plan = 'free'),
    'trialing_shops', (select count(*) from public.subscriptions where status = 'trialing'),
    'total_leads',    (select count(*) from public.catalog_leads),
    'total_quotes',   (select count(*) from public.quotes),
    'total_revenue',  (select coalesce(sum(amount),0) from public.sales where payment_status = 'paid'),
    'new_shops_7d',   (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'shops_list', (
      select json_agg(row_to_json(t)) from (
        select
          sc.shop_name,
          sc.slug,
          sc.plan,
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
    )
  ) into result;
  return result;
end;
$$;

-- ── 12. Insertar el super-admin (reemplazá el email) ─────────
-- IMPORTANTE: Ejecutar esto DESPUÉS de que el usuario exista en auth.users
-- insert into public.super_admin_users (user_id, email)
-- select id, email from auth.users where email = 'TU_EMAIL_AQUI@gmail.com'
-- on conflict (user_id) do nothing;
