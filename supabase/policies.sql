alter table profiles enable row level security;
alter table clients enable row level security;
alter table suppliers enable row level security;
alter table materials enable row level security;
alter table material_movements enable row level security;
alter table leads enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table cut_pieces enable row level security;
alter table sales enable row level security;

create policy "profiles own" on profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "clients own" on clients
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "suppliers own" on suppliers
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "materials own" on materials
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "material_movements own" on material_movements
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "leads own" on leads
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "quotes own" on quotes
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "quote_items via quote" on quote_items
for all using (
  exists (
    select 1 from quotes q where q.id = quote_items.quote_id and q.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from quotes q where q.id = quote_items.quote_id and q.owner_id = auth.uid()
  )
);

create policy "cut_pieces via quote" on cut_pieces
for all using (
  exists (
    select 1 from quotes q where q.id = cut_pieces.quote_id and q.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from quotes q where q.id = cut_pieces.quote_id and q.owner_id = auth.uid()
  )
);

create policy "sales own" on sales
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);