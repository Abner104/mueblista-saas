-- ============================================================
-- CARPENTO — Asignación múltiple de trabajadores + checklist de tareas
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- sales.assigned_worker_id sigue existiendo (responsable principal,
-- opcional). order_assignments es la fuente de verdad para "quién
-- trabaja en esta orden" cuando es más de una persona.

-- ── order_assignments: varios trabajadores por orden ─────────
create table if not exists public.order_assignments (
  id         bigserial primary key,
  sale_id    uuid not null references public.sales(id) on delete cascade,
  worker_id  bigint not null references public.workers(id) on delete cascade,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (sale_id, worker_id)
);
alter table public.order_assignments enable row level security;

drop policy if exists "order_assignments_owner" on public.order_assignments;
create policy "order_assignments_owner" on public.order_assignments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- El trabajador asignado puede ver sus propias filas de asignación
-- (para saber en qué órdenes está, sin ser el owner)
drop policy if exists "order_assignments_worker_read" on public.order_assignments;
create policy "order_assignments_worker_read" on public.order_assignments
  for select using (
    exists (
      select 1 from public.workers w
      where w.id = order_assignments.worker_id
        and w.invited_user_id = auth.uid()
    )
  );

-- ── order_tasks: checklist por orden ──────────────────────────
-- stage: agrupa la tarea en una etapa del proceso de instalación.
-- 'medicion' | 'materiales' | 'instalacion' | 'entrega' | 'otro'
create table if not exists public.order_tasks (
  id           bigserial primary key,
  sale_id      uuid not null references public.sales(id) on delete cascade,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  stage        text not null default 'otro' check (stage in ('medicion','materiales','instalacion','entrega','otro')),
  label        text not null,
  done         boolean not null default false,
  done_by      bigint references public.workers(id) on delete set null,
  done_at      timestamptz,
  sort_order   int not null default 0,
  created_at   timestamptz default now()
);
alter table public.order_tasks enable row level security;

drop policy if exists "order_tasks_owner" on public.order_tasks;
create policy "order_tasks_owner" on public.order_tasks
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Un trabajador asignado a la orden puede leer y tildar sus tareas
drop policy if exists "order_tasks_worker_read" on public.order_tasks;
create policy "order_tasks_worker_read" on public.order_tasks
  for select using (
    exists (
      select 1 from public.order_assignments oa
      join public.workers w on w.id = oa.worker_id
      where oa.sale_id = order_tasks.sale_id
        and w.invited_user_id = auth.uid()
    )
  );

drop policy if exists "order_tasks_worker_update" on public.order_tasks;
create policy "order_tasks_worker_update" on public.order_tasks
  for update using (
    exists (
      select 1 from public.order_assignments oa
      join public.workers w on w.id = oa.worker_id
      where oa.sale_id = order_tasks.sale_id
        and w.invited_user_id = auth.uid()
    )
  );

-- Plantilla de checklist por defecto al crear una orden — se llama desde
-- el frontend después de insertar en sales. No es un trigger automático
-- porque el checklist varía según el tipo de trabajo (PVC vs drywall vs mueble).
