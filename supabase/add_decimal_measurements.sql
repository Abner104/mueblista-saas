-- ============================================================
-- CARPENTO — Medidas con decimales
-- ============================================================
-- Los inputs del frontend ya aceptan decimales (step="any"), pero las
-- columnas de medidas en la base seguian siendo "integer", por lo que
-- Postgres rechazaba cualquier valor con punto ("invalid input syntax
-- for type integer"). Se pasan a numeric para admitir decimales
-- (ej. 2.44 m, 15.5 mm) de punta a punta.
--
-- Ejecutar en Supabase SQL Editor.

alter table public.quotes
  alter column width_mm  type numeric(12,2) using width_mm::numeric,
  alter column height_mm type numeric(12,2) using height_mm::numeric,
  alter column depth_mm  type numeric(12,2) using depth_mm::numeric;

alter table public.cut_pieces
  alter column width_mm  type numeric(12,2) using width_mm::numeric,
  alter column height_mm type numeric(12,2) using height_mm::numeric;

alter table public.materials
  alter column sheet_width_mm  type numeric(12,2) using sheet_width_mm::numeric,
  alter column sheet_height_mm type numeric(12,2) using sheet_height_mm::numeric;
