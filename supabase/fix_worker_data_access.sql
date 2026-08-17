-- ============================================================
-- CARPENTO — RLS para que maestro/vendedor vean sus propios datos
-- ============================================================
-- Mismo bug que ya arreglamos en "workers": las policies existentes de
-- sales/quotes/clients/quote_items exigen owner_id = auth.uid(), pero
-- un trabajador logueado tiene su propio auth.uid() (no el del dueño),
-- así que MaestroPage y VendedorPage siempre ven listas vacías / $0,
-- sin ningún error visible, aunque el código de esas páginas esté bien.
--
-- Ejecutar en Supabase SQL Editor.

-- ── SALES ────────────────────────────────────────────────────
-- Un maestro lee las órdenes donde está en el equipo asignado
-- (order_assignments) o es el responsable legacy (assigned_worker_id).
drop policy if exists "sales_worker_read" on public.sales;
create policy "sales_worker_read" on public.sales
  for select using (
    exists (
      select 1 from public.order_assignments oa
      join public.workers w on w.id = oa.worker_id
      where oa.sale_id = sales.id and w.invited_user_id = auth.uid()
    )
    or exists (
      select 1 from public.workers w
      where w.id = sales.assigned_worker_id and w.invited_user_id = auth.uid()
    )
    or exists (
      select 1 from public.workers w
      where w.id = sales.seller_worker_id and w.invited_user_id = auth.uid()
    )
  );

-- Un maestro asignado puede avanzar el estado de producción de su orden
-- (MaestroPage.jsx -> advance()). No puede tocar amount ni payment_status
-- porque el UPDATE solo cambia status; WITH CHECK usa el mismo criterio
-- de lectura para no permitir reasignarse a otra orden.
drop policy if exists "sales_worker_update_status" on public.sales;
create policy "sales_worker_update_status" on public.sales
  for update using (
    exists (
      select 1 from public.order_assignments oa
      join public.workers w on w.id = oa.worker_id
      where oa.sale_id = sales.id and w.invited_user_id = auth.uid()
    )
    or exists (
      select 1 from public.workers w
      where w.id = sales.assigned_worker_id and w.invited_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.order_assignments oa
      join public.workers w on w.id = oa.worker_id
      where oa.sale_id = sales.id and w.invited_user_id = auth.uid()
    )
    or exists (
      select 1 from public.workers w
      where w.id = sales.assigned_worker_id and w.invited_user_id = auth.uid()
    )
  );

-- ── QUOTES ───────────────────────────────────────────────────
-- Un vendedor lee/gestiona las cotizaciones que vendió.
drop policy if exists "quotes_worker_seller" on public.quotes;
create policy "quotes_worker_seller" on public.quotes
  for all using (
    exists (
      select 1 from public.workers w
      where w.id = quotes.seller_worker_id and w.invited_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workers w
      where w.id = quotes.seller_worker_id and w.invited_user_id = auth.uid()
    )
  );

-- Un maestro lee la cotización asociada a una orden que tiene asignada
-- (MaestroPage muestra tipo de mueble, dimensiones y quote_items).
drop policy if exists "quotes_worker_via_sale" on public.quotes;
create policy "quotes_worker_via_sale" on public.quotes
  for select using (
    exists (
      select 1 from public.sales s
      join public.order_assignments oa on oa.sale_id = s.id
      join public.workers w on w.id = oa.worker_id
      where s.quote_id = quotes.id and w.invited_user_id = auth.uid()
    )
    or exists (
      select 1 from public.sales s
      join public.workers w on w.id = s.assigned_worker_id
      where s.quote_id = quotes.id and w.invited_user_id = auth.uid()
    )
  );

-- ── QUOTE_ITEMS ──────────────────────────────────────────────
-- Sigue la misma visibilidad que su cotización (vendedor propio o
-- maestro con orden asignada a esa cotización).
drop policy if exists "quote_items_worker_read" on public.quote_items;
create policy "quote_items_worker_read" on public.quote_items
  for select using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id
        and (
          exists (select 1 from public.workers w where w.id = q.seller_worker_id and w.invited_user_id = auth.uid())
          or exists (
            select 1 from public.sales s
            join public.order_assignments oa on oa.sale_id = s.id
            join public.workers w on w.id = oa.worker_id
            where s.quote_id = q.id and w.invited_user_id = auth.uid()
          )
          or exists (
            select 1 from public.sales s
            join public.workers w on w.id = s.assigned_worker_id
            where s.quote_id = q.id and w.invited_user_id = auth.uid()
          )
        )
    )
  );

-- ── CLIENTS ──────────────────────────────────────────────────
-- Un trabajador (maestro o vendedor) necesita leer el nombre/teléfono
-- del cliente asociado a una orden o cotización que puede ver — si no,
-- la orden le muestra "—" en vez del cliente aunque sales.client_id
-- esté completo.
drop policy if exists "clients_worker_read" on public.clients;
create policy "clients_worker_read" on public.clients
  for select using (
    exists (
      select 1 from public.sales s
      join public.order_assignments oa on oa.sale_id = s.id
      join public.workers w on w.id = oa.worker_id
      where s.client_id = clients.id and w.invited_user_id = auth.uid()
    )
    or exists (
      select 1 from public.sales s
      join public.workers w on w.id = s.assigned_worker_id
      where s.client_id = clients.id and w.invited_user_id = auth.uid()
    )
    or exists (
      select 1 from public.quotes q
      join public.workers w on w.id = q.seller_worker_id
      where q.client_id = clients.id and w.invited_user_id = auth.uid()
    )
  );
