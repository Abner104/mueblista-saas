-- Fix RLS: el owner debe poder leer TODOS sus productos (incluso los ocultos)
-- Ejecutar en Supabase SQL Editor

-- Eliminar la política de lectura pública actual (solo ve visibles)
drop policy if exists "catalog_public_read" on catalog_products;

-- Nueva política: visitantes ven solo visibles, owner ve todos los suyos
create policy "catalog_select"
  on catalog_products for select
  using (
    visible = true
    or auth.uid() = owner_id
  );
