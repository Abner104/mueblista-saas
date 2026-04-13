-- ============================================================
-- CARPENTO — Plan Config
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla que guarda la configuración editable de cada plan
create table if not exists public.plan_config (
  id           bigserial primary key,
  plan_id      text not null unique check (plan_id in ('free', 'pro', 'enterprise')),
  name         text not null,
  price        numeric(10,2) not null default 0,
  currency     text not null default 'ARS',
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

-- RLS: solo service_role escribe, cualquier autenticado lee
alter table public.plan_config enable row level security;

create policy "plan_config_public_read" on public.plan_config
  for select using (true);

create policy "plan_config_service_write" on public.plan_config
  for all using (auth.role() = 'service_role');

-- Datos iniciales
insert into public.plan_config (plan_id, name, price, currency, period, color, max_products, max_clients, can_optimizer, can_workers, features)
values
  ('free', 'Free', 0, 'CLP', 'para siempre', '#71717a', 10, 20, false, false,
   '[
     {"label": "Hasta 10 productos en el catálogo"},
     {"label": "Hasta 20 clientes"},
     {"label": "Cotizaciones ilimitadas"},
     {"label": "Catálogo público online"}
   ]'::jsonb
  ),
  ('pro', 'Pro', 9990, 'CLP', 'por mes', '#c8923a', 999999, 999999, true, true,
   '[
     {"label": "Productos ilimitados"},
     {"label": "Clientes ilimitados"},
     {"label": "Optimizador de cortes CNC"},
     {"label": "Gestión de equipo con roles"},
     {"label": "PDF profesional de cotizaciones"},
     {"label": "Soporte prioritario"}
   ]'::jsonb
  ),
  ('enterprise', 'Enterprise', 0, 'CLP', 'por mes', '#7c3aed', 999999, 999999, true, true,
   '[
     {"label": "Todo lo del plan Pro"},
     {"label": "Onboarding personalizado"},
     {"label": "SLA garantizado"},
     {"label": "Facturación mensual"}
   ]'::jsonb
  )
on conflict (plan_id) do nothing;
