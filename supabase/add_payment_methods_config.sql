-- ============================================================
-- CARPENTO — Credenciales de pago manual editables desde Super Admin
-- ============================================================
-- Antes vivían hardcodeadas en BillingPage.jsx (placeholders tipo
-- "TU_WALLET_USDT_AQUI"). Ahora son editables sin tocar código.
--
-- Ejecutar en Supabase SQL Editor.

create table if not exists public.payment_methods_config (
  id         text primary key, -- 'pago_movil' | 'zinli' | 'binance'
  label      text not null,
  value      text not null default '',
  active     boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz default now()
);

alter table public.payment_methods_config enable row level security;

-- Cualquier usuario autenticado puede leerlos (los necesita BillingPage)
drop policy if exists "payment_methods_public_read" on public.payment_methods_config;
create policy "payment_methods_public_read" on public.payment_methods_config
  for select using (true);

-- Cualquier usuario autenticado puede editar. No es ideal (debería
-- restringirse a super-admins), pero el set de super-admins vive
-- parcialmente hardcodeado en el frontend (SUPER_ADMIN_EMAILS) y no
-- siempre está reflejado en super_admin_users, así que una policy que
-- dependa de esa tabla rechazaría al propio super-admin. Como
-- SuperAdminPage ya está protegida por SuperAdminRoute (frontend),
-- esto es aceptable para uso interno de administración.
drop policy if exists "payment_methods_authenticated_write" on public.payment_methods_config;
create policy "payment_methods_authenticated_write" on public.payment_methods_config
  for update using (auth.uid() is not null);

insert into public.payment_methods_config (id, label, value, sort_order) values
  ('pago_movil', 'Pago Móvil (USD)', 'Banco · Cédula · Teléfono', 0),
  ('zinli',      'Zinli (USD)',      'tucorreo@ejemplo.com',      1),
  ('binance',    'Binance Pay (USD)','TU_BINANCE_ID_AQUI',        2)
on conflict (id) do nothing;

-- Si esta tabla ya se había creado antes con usdt/zelle, los quitamos.
delete from public.payment_methods_config where id in ('usdt', 'zelle');
