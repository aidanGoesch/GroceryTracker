create table if not exists public.grocery_list_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  is_checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists grocery_list_items_is_checked_idx
  on public.grocery_list_items (is_checked);

create index if not exists grocery_list_items_created_at_idx
  on public.grocery_list_items (created_at desc);

create or replace function public.set_grocery_list_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_grocery_list_items_updated_at on public.grocery_list_items;

create trigger trg_grocery_list_items_updated_at
before update on public.grocery_list_items
for each row
execute function public.set_grocery_list_items_updated_at();

alter table public.grocery_list_items enable row level security;

drop policy if exists "allow anon read grocery list items" on public.grocery_list_items;
create policy "allow anon read grocery list items"
on public.grocery_list_items
for select
to anon
using (true);

drop policy if exists "allow anon insert grocery list items" on public.grocery_list_items;
create policy "allow anon insert grocery list items"
on public.grocery_list_items
for insert
to anon
with check (true);

drop policy if exists "allow anon update grocery list items" on public.grocery_list_items;
create policy "allow anon update grocery list items"
on public.grocery_list_items
for update
to anon
using (true)
with check (true);

drop policy if exists "allow anon delete grocery list items" on public.grocery_list_items;
create policy "allow anon delete grocery list items"
on public.grocery_list_items
for delete
to anon
using (true);
