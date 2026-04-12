create extension if not exists pgcrypto;
  material_id uuid not null references materials(id) on delete cascade,
  type text check (type in ('in', 'out', 'adjustment')) not null,
  quantity numeric(12,2) not null,
  note text,
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  source text,
  status text check (status in ('new', 'quoted', 'negotiation', 'won', 'lost')) default 'new',
  estimated_value numeric(12,2) default 0,
  notes text,
  created_at timestamptz default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  title text not null,
  furniture_type text not null,
  width_mm integer not null,
  height_mm integer not null,
  depth_mm integer not null,
  labor_cost numeric(12,2) not null default 0,
  extra_cost numeric(12,2) not null default 0,
  margin_percent numeric(5,2) not null default 30,
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text check (status in ('draft', 'sent', 'approved', 'rejected')) default 'draft',
  created_at timestamptz default now()
);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  material_id uuid references materials(id) on delete set null,
  description text not null,
  quantity numeric(12,2) not null,
  unit text not null,
  unit_cost numeric(12,2) not null,
  total_cost numeric(12,2) not null
);

create table if not exists cut_pieces (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id) on delete cascade,
  name text not null,
  width_mm integer not null,
  height_mm integer not null,
  quantity integer not null default 1,
  material_name text,
  created_at timestamptz default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  status text check (status in ('pending', 'confirmed', 'in_production', 'delivered', 'paid')) default 'pending',
  amount numeric(12,2) not null default 0,
  payment_status text check (payment_status in ('unpaid', 'partial', 'paid')) default 'unpaid',
  due_date date,
  created_at timestamptz default now()
);