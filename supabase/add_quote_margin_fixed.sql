-- ============================================================
-- CARPENTO — Margen de ganancia como monto fijo ($) además de %
-- ============================================================
-- margin_mode='percent' (default, como siempre) usa margin_percent.
-- margin_mode='fixed' usa margin_amount: un monto en $ que se suma
-- directo al subtotal, en vez de calcular un porcentaje.
--
-- Ejecutar en Supabase SQL Editor.

alter table public.quotes
  add column if not exists margin_mode   text not null default 'percent' check (margin_mode in ('percent', 'fixed')),
  add column if not exists margin_amount numeric(12,2);
