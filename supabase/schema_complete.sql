-- ═══════════════════════════════════════════════════════════════
-- WOODFLOW — Schema completo
-- Ejecutar TODO en Supabase SQL Editor (en orden)
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── 1. Profiles ──────────────────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  avatar_url text,
  created_at timestamptz default now()
);

-- ── 2. Clients ───────────────────────────────────────────────────
create table if not exists clients (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  phone      text,
  email      text,
  address    text,
  notes      text,
  created_at timestamptz default now()
);

-- ── 3. Suppliers ─────────────────────────────────────────────────
create table if not exists suppliers (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  phone      text,
  email      text,
  address    text,
  notes      text,
  created_at timestamptz default now()
);

-- ── 4. Materials ─────────────────────────────────────────────────
create table if not exists materials (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  supplier_id     uuid references suppliers(id) on delete set null,
  name            text not null,
  sku             text,
  category        text default 'melamina',
  unit            text default 'unidad',
  cost            numeric(12,2) default 0,
  stock           numeric(12,2) default 0,
  min_stock       numeric(12,2) default 0,
  sheet_width_mm  integer,
  sheet_height_mm integer,
  created_at      timestamptz default now()
);

-- ── 5. Material movements ────────────────────────────────────────
create table if not exists material_movements (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null references materials(id) on delete cascade,
  type        text check (type in ('in', 'out', 'adjustment')) not null,
  quantity    numeric(12,2) not null,
  note        text,
  created_at  timestamptz default now()
);

-- ── 6. Leads (internos) ──────────────────────────────────────────
create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  client_id       uuid references clients(id) on delete set null,
  title           text not null,
  source          text,
  status          text check (status in ('new', 'quoted', 'negotiation', 'won', 'lost')) default 'new',
  estimated_value numeric(12,2) default 0,
  notes           text,
  created_at      timestamptz default now()
);

-- ── 7. Quotes ────────────────────────────────────────────────────
create table if not exists quotes (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  client_id      uuid not null references clients(id) on delete cascade,
  lead_id        uuid references leads(id) on delete set null,
  title          text not null,
  furniture_type text not null,
  width_mm       integer not null,
  height_mm      integer not null,
  depth_mm       integer not null,
  labor_cost     numeric(12,2) not null default 0,
  extra_cost     numeric(12,2) not null default 0,
  margin_percent numeric(5,2) not null default 30,
  subtotal       numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  status         text check (status in ('draft', 'sent', 'approved', 'rejected')) default 'draft',
  created_at     timestamptz default now()
);

-- ── 8. Quote items ───────────────────────────────────────────────
create table if not exists quote_items (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references quotes(id) on delete cascade,
  material_id uuid references materials(id) on delete set null,
  description text not null,
  quantity    numeric(12,2) not null,
  unit        text not null,
  unit_cost   numeric(12,2) not null,
  total_cost  numeric(12,2) not null
);

-- ── 9. Cut pieces ────────────────────────────────────────────────
create table if not exists cut_pieces (
  id            uuid primary key default gen_random_uuid(),
  quote_id      uuid references quotes(id) on delete cascade,
  name          text not null,
  width_mm      integer not null,
  height_mm     integer not null,
  quantity      integer not null default 1,
  material_name text,
  created_at    timestamptz default now()
);

-- ── 10. Sales / Órdenes ──────────────────────────────────────────
create table if not exists sales (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  client_id      uuid references clients(id) on delete set null,
  quote_id       uuid references quotes(id) on delete set null,
  lead_id        uuid references leads(id) on delete set null,
  status         text check (status in ('pending', 'confirmed', 'in_production', 'delivered', 'paid')) default 'pending',
  amount         numeric(12,2) not null default 0,
  payment_status text check (payment_status in ('unpaid', 'partial', 'paid')) default 'unpaid',
  due_date       date,
  created_at     timestamptz default now()
);

-- ── 11. Shop config (catálogo público) ───────────────────────────
create table if not exists shop_config (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null unique references auth.users(id) on delete cascade,
  shop_name     text not null default 'Mi Taller',
  slug          text not null default '',
  accent_color  text default '#c8923a',
  tagline       text default '',
  phone         text default '',
  whatsapp      text default '',
  address       text default '',
  stats         jsonb default '[]'::jsonb,
  guarantees    jsonb default '[]'::jsonb,
  created_at    timestamptz default now()
);

create unique index if not exists shop_config_slug_idx on shop_config(slug) where slug <> '';

-- ── 12. Catalog products ─────────────────────────────────────────
create table if not exists catalog_products (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text default '',
  category    text default '',
  price       numeric(12,2) default 0,
  time        text default '',
  wood        text default '',
  finish      text default '',
  dims        text default '',
  tag         text default '',
  photos      jsonb default '[]'::jsonb,
  details     jsonb default '[]'::jsonb,
  visible     boolean default true,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- ── 13. Catalog leads (del formulario público) ───────────────────
create table if not exists catalog_leads (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  phone        text not null,
  email        text default '',
  message      text default '',
  product_id   uuid references catalog_products(id) on delete set null,
  product_name text default '',
  status       text check (status in ('new', 'contacted', 'quoted', 'closed')) default 'new',
  created_at   timestamptz default now()
);

-- ════════════════════════════════════════════════════════════════
-- RLS — Row Level Security
-- ════════════════════════════════════════════════════════════════

alter table profiles          enable row level security;
alter table clients           enable row level security;
alter table suppliers         enable row level security;
alter table materials         enable row level security;
alter table material_movements enable row level security;
alter table leads             enable row level security;
alter table quotes            enable row level security;
alter table quote_items       enable row level security;
alter table cut_pieces        enable row level security;
alter table sales             enable row level security;
alter table shop_config       enable row level security;
alter table catalog_products  enable row level security;
alter table catalog_leads     enable row level security;

-- Profiles
create policy "profiles own" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Clients
create policy "clients own" on clients
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Suppliers
create policy "suppliers own" on suppliers
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Materials
create policy "materials own" on materials
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Material movements
create policy "material_movements own" on material_movements
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Leads internos
create policy "leads own" on leads
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Quotes
create policy "quotes own" on quotes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Quote items (via quote owner)
create policy "quote_items via quote" on quote_items
  for all using (
    exists (select 1 from quotes q where q.id = quote_items.quote_id and q.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from quotes q where q.id = quote_items.quote_id and q.owner_id = auth.uid())
  );

-- Cut pieces
create policy "cut_pieces via quote" on cut_pieces
  for all using (
    exists (select 1 from quotes q where q.id = cut_pieces.quote_id and q.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from quotes q where q.id = cut_pieces.quote_id and q.owner_id = auth.uid())
  );

-- Sales
create policy "sales own" on sales
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Shop config
create policy "shop_config own" on shop_config
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Catalog products: público lee visible=true, owner ve todo
create policy "catalog_products select" on catalog_products
  for select using (visible = true or auth.uid() = owner_id);
create policy "catalog_products owner write" on catalog_products
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Catalog leads: insert público (sin login), owner lee/gestiona
create policy "catalog_leads public insert" on catalog_leads
  for insert with check (true);
create policy "catalog_leads owner read" on catalog_leads
  for select using (auth.uid() = owner_id);
create policy "catalog_leads owner update" on catalog_leads
  for update using (auth.uid() = owner_id);
create policy "catalog_leads owner delete" on catalog_leads
  for delete using (auth.uid() = owner_id);

-- ════════════════════════════════════════════════════════════════
-- Storage bucket para fotos del catálogo
-- ════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
  values ('catalog-photos', 'catalog-photos', true)
  on conflict (id) do nothing;

create policy "catalog photos public read" on storage.objects
  for select using (bucket_id = 'catalog-photos');

create policy "catalog photos owner upload" on storage.objects
  for insert with check (bucket_id = 'catalog-photos' and auth.uid() is not null);

create policy "catalog photos owner delete" on storage.objects
  for delete using (bucket_id = 'catalog-photos' and auth.uid() is not null);
