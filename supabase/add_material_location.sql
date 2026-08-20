-- ============================================================
-- CARPENTO — Ubicación física del material en Inventario
-- ============================================================
-- Campo opcional de texto libre (ej: "Estante 3", "Pasillo B",
-- "Depósito exterior") para que el taller ubique físicamente el
-- material sin tener que memorizarlo.
--
-- Ejecutar en Supabase SQL Editor.

alter table public.materials
  add column if not exists location text default '';

-- Tipo de movimiento "waste" (merma) — material dañado, cortado de más,
-- perdido. Se distingue de "out" (salida por uso productivo normal)
-- para que el historial diferencie consumo real de pérdida.
alter table public.material_movements
  drop constraint if exists material_movements_type_check;

alter table public.material_movements
  add constraint material_movements_type_check
  check (type in ('in', 'out', 'adjustment', 'waste'));
