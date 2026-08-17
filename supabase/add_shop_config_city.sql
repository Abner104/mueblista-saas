-- ============================================================
-- CARPENTO — Columna "city" faltante en shop_config
-- ============================================================
-- El editor del catálogo (SalesRoomPage) y la vista pública
-- (CatalogPage) ya leían/escribían shop_config.city, pero la columna
-- nunca se creó en ninguna migración. Al guardar, Supabase rechazaba
-- el upsert completo con 400 porque "city" no es una columna real.
--
-- Ejecutar en Supabase SQL Editor.

alter table public.shop_config
  add column if not exists city text default '';
