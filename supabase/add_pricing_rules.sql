-- ============================================================
-- CARPENTO — Tarifas por tipo de trabajo (cotizador público)
-- ============================================================
-- El dueño carga un precio base por m² por tipo de trabajo (ej.
-- "Cielo raso PVC" → $18/m², "Pared drywall" → $22/m²). El catálogo
-- público usa esto para mostrarle al cliente un RANGO estimado
-- (base y base + margen%) antes de que pida la cotización exacta por
-- WhatsApp/formulario — nunca un precio final cerrado.
--
-- Ejecutar en Supabase SQL Editor.

create table if not exists public.pricing_rules (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  label         text not null,               -- "Cielo raso PVC"
  price_m2      numeric(12,2) not null default 0,
  range_pct     numeric(5,2)  not null default 20, -- margen superior del rango (%)
  sort_order    int not null default 0,
  visible       boolean not null default true,
  created_at    timestamptz default now()
);

alter table public.pricing_rules enable row level security;

drop policy if exists "pricing_rules own" on public.pricing_rules;
create policy "pricing_rules own" on public.pricing_rules
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Lectura pública (catálogo sin login) — solo lo visible.
drop policy if exists "pricing_rules public read" on public.pricing_rules;
create policy "pricing_rules public read" on public.pricing_rules
  for select using (visible = true);
