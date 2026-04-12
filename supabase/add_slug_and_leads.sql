-- ─────────────────────────────────────────────────────────────
-- MIGRACIÓN: slug en shop_config + tabla catalog_leads
-- Ejecutar en Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Agregar slug a shop_config (único por taller)
alter table shop_config
  add column if not exists slug text not null default '';

-- Índice único para búsqueda por slug
create unique index if not exists shop_config_slug_idx on shop_config(slug)
  where slug <> '';

-- 2. Tabla de leads del catálogo público
--    Un cliente llena el formulario en /catalogo/:slug y se guarda aquí
create table if not exists catalog_leads (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  phone       text not null,
  email       text default '',
  message     text default '',
  product_id  uuid references catalog_products(id) on delete set null,
  product_name text default '',
  status      text check (status in ('new', 'contacted', 'quoted', 'closed')) default 'new',
  created_at  timestamptz default now()
);

-- 3. RLS para catalog_leads
alter table catalog_leads enable row level security;

-- Cualquiera puede insertar un lead (formulario público sin login)
create policy "catalog_leads_public_insert"
  on catalog_leads for insert
  with check (true);

-- Solo el owner puede leer y gestionar sus leads
create policy "catalog_leads_owner_read"
  on catalog_leads for select
  using (auth.uid() = owner_id);

create policy "catalog_leads_owner_update"
  on catalog_leads for update
  using (auth.uid() = owner_id);

create policy "catalog_leads_owner_delete"
  on catalog_leads for delete
  using (auth.uid() = owner_id);
