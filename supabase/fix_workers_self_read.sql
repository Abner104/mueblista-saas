-- ============================================================
-- CARPENTO — Permitir que un trabajador lea su propia fila
-- ============================================================
-- Bug: roleStore.loadRole() consulta workers.eq('invited_user_id', userId)
-- para saber si el usuario logueado es un trabajador (maestro/vendedor)
-- y a qué taller pertenece. La única policy existente ("workers_owner")
-- exige owner_id = auth.uid(), así que un trabajador logueado (cuyo
-- auth.uid() es su propio user id, no el del dueño) nunca puede leer
-- ni su propia fila — la consulta vuelve vacía y el sistema lo trata
-- como si fuera admin/dueño, mandándolo al panel completo.
--
-- Ejecutar en Supabase SQL Editor.

drop policy if exists "workers_self_read" on public.workers;
create policy "workers_self_read" on public.workers
  for select using (invited_user_id = auth.uid());
