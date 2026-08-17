-- ============================================================
-- CARPENTO — Plan Config
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla que guarda la configuración editable de cada plan
-- "prices" guarda un precio por moneda, ej: {"CLP": 9990, "USD": 10}.
-- El frontend elige la moneda según el país del taller (ver src/lib/countries.js).
-- "price"/"currency" quedan como fallback legacy (moneda por defecto) para
-- países sin entrada propia en "prices".
create table if not exists public.plan_config (
  id           bigserial primary key,
  plan_id      text not null unique check (plan_id in ('free', 'pro', 'enterprise')),
  name         text not null,
  price        numeric(10,2) not null default 0,
  currency     text not null default 'CLP',
  prices       jsonb not null default '{}'::jsonb,
  period       text not null default 'mes',
  color        text not null default '#71717a',
  max_products int not null default 10,
  max_clients  int not null default 20,
  can_optimizer boolean not null default false,
  can_workers   boolean not null default false,
  features     jsonb not null default '[]'::jsonb,
  active       boolean not null default true,
  updated_at   timestamptz default now()
);

-- Si la tabla ya existía de antes, agrega la columna nueva sin romper nada.
alter table public.plan_config add column if not exists prices jsonb not null default '{}'::jsonb;

-- RLS: solo service_role escribe, cualquier autenticado lee
alter table public.plan_config enable row level security;

drop policy if exists "plan_config_public_read" on public.plan_config;
create policy "plan_config_public_read" on public.plan_config
  for select using (true);

drop policy if exists "plan_config_service_write" on public.plan_config;
create policy "plan_config_service_write" on public.plan_config
  for all using (auth.role() = 'service_role');

-- Datos iniciales
-- prices: agregá una entrada por cada moneda que necesites (CLP, ARS, MXN, COP, PEN, UYU, USD...).
-- USD cubre Venezuela y "otro país" (ver src/lib/countries.js).
insert into public.plan_config (plan_id, name, price, currency, prices, period, color, max_products, max_clients, can_optimizer, can_workers, features)
values
  ('free', 'Free', 0, 'CLP', '{"CLP": 0, "USD": 0}'::jsonb, 'para siempre', '#71717a', 10, 20, false, false,
   '[
     {"label": "Hasta 10 productos en el catálogo"},
     {"label": "Hasta 20 clientes"},
     {"label": "Cotizaciones ilimitadas"},
     {"label": "Catálogo público online"}
   ]'::jsonb
  ),
  ('pro', 'Pro', 9990, 'CLP', '{"CLP": 9990, "USD": 10}'::jsonb, 'por mes', '#c8923a', 999999, 999999, true, true,
   '[
     {"label": "Productos ilimitados"},
     {"label": "Clientes ilimitados"},
     {"label": "Optimizador de cortes CNC"},
     {"label": "Gestión de equipo con roles"},
     {"label": "PDF profesional de cotizaciones"},
     {"label": "Soporte prioritario"}
   ]'::jsonb
  ),
  ('enterprise', 'Enterprise', 0, 'CLP', '{"CLP": 0, "USD": 0}'::jsonb, 'por mes', '#7c3aed', 999999, 999999, true, true,
   '[
     {"label": "Todo lo del plan Pro"},
     {"label": "Onboarding personalizado"},
     {"label": "SLA garantizado"},
     {"label": "Facturación mensual"}
   ]'::jsonb
  )
on conflict (plan_id) do update set
  prices = excluded.prices;
