-- ============================================================
-- CARPENTO — Distinguir "solo instalación" de "materiales + instalación"
-- ============================================================
-- includes_materials=true (default): el mueblista provee los
-- materiales, se cotizan junto con la mano de obra/instalación.
-- includes_materials=false: el cliente pone el material, solo se
-- cobra el servicio de instalación/mano de obra.
--
-- Ejecutar en Supabase SQL Editor.

alter table public.quotes
  add column if not exists includes_materials boolean not null default true;
