-- ============================================================
-- CARPENTO — Cobro por m² en cotizaciones (instalación de PVC/drywall)
-- ============================================================
-- Convive con el modo actual (mueble a medida, dimensiones en mm):
-- billing_mode='fixed' (default, como siempre) o 'area' (m²).
-- En modo 'area', area_width_m × area_height_m × area_price_m2
-- reemplaza labor_cost en el cálculo del total.
--
-- Ejecutar en Supabase SQL Editor.

alter table public.quotes
  add column if not exists billing_mode    text not null default 'fixed' check (billing_mode in ('fixed', 'area')),
  add column if not exists area_width_m    numeric(8,2),
  add column if not exists area_height_m   numeric(8,2),
  add column if not exists area_price_m2   numeric(12,2);

-- furniture_type deja de ser obligatorio — con billing_mode='area' el
-- tipo de trabajo es texto libre (ej: "Cielo raso", "Pared PVC") y
-- puede no aplicar el concepto de "mueble".
alter table public.quotes alter column furniture_type drop not null;

-- width_mm/height_mm/depth_mm quedan solo para billing_mode='fixed'.
alter table public.quotes alter column width_mm  drop not null;
alter table public.quotes alter column height_mm drop not null;
alter table public.quotes alter column depth_mm  drop not null;
