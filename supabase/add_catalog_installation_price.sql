-- ============================================================
-- CARPENTO — Segundo precio en el catálogo: solo instalación
-- ============================================================
-- catalog_products.price ya existía — pasa a representar el precio de
-- "trabajo completo" (materiales + instalación). price_installation es
-- el precio de "solo instalación" (el cliente pone el material), y es
-- opcional: si queda vacío, el catálogo público solo muestra el precio
-- de trabajo completo como siempre.
--
-- Mismo tipo que "price" (texto libre) para soportar valores como
-- "Consultar" además de números.
--
-- Ejecutar en Supabase SQL Editor.

alter table public.catalog_products
  add column if not exists price_installation text default '';
