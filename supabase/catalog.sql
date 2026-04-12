-- ─────────────────────────────────────────────────────────────
-- CATÁLOGO PÚBLICO + CONFIGURACIÓN DEL TALLER
-- Ejecutar en Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Configuración visual del taller
create table if not exists shop_config (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  shop_name    text not null default 'Mi Carpintería',
  tagline      text default 'Muebles a medida con materiales de primera',
  accent_color text default '#c8923a',
  phone        text default '',
  address      text default '',
  hours        text default 'Lun–Vie 8:00–18:00',
  logo_url     text default '',
  stats        jsonb default '[
    {"label":"Proyectos entregados","value":"120+"},
    {"label":"Clientes satisfechos","value":"98%"},
    {"label":"Años de trayectoria","value":"5"},
    {"label":"Respuesta cotización","value":"24h"}
  ]'::jsonb,
  guarantees   jsonb default '["Sin adelanto","Instalación incluida","Garantía 12 meses","Corte CNC de precisión"]'::jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create unique index if not exists shop_config_owner_idx on shop_config(owner_id);

-- 2. Productos del catálogo público (con array de fotos)
create table if not exists catalog_products (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  category    text not null default 'otro',
  price       text not null default '0',
  time        text default '',
  tag         text default '',
  wood        text default '',
  finish      text default '',
  dims        text default '',
  description text default '',
  photos      jsonb not null default '[]'::jsonb,  -- array de URLs ["url1","url2",...]
  visible     boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 3. RLS
alter table shop_config      enable row level security;
alter table catalog_products enable row level security;

create policy "shop_config_public_read"  on shop_config      for select using (true);
create policy "shop_config_owner_write"  on shop_config      for all    using (auth.uid() = owner_id);

create policy "catalog_public_read"      on catalog_products for select using (visible = true);
create policy "catalog_owner_all"        on catalog_products for all    using (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────────
-- STORAGE BUCKET para fotos de productos
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('catalog-photos', 'catalog-photos', true)
on conflict (id) do nothing;

create policy "catalog_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'catalog-photos');

create policy "catalog_photos_auth_upload"
  on storage.objects for insert
  with check (bucket_id = 'catalog-photos' and auth.role() = 'authenticated');

create policy "catalog_photos_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'catalog-photos' and auth.uid()::text = (storage.foldername(name))[1]);
