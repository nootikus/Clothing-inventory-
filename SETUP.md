# Shared Clothing Inventory setup

This version is designed for both Android and iPhone. It uses Supabase as the shared online database.

1. Create a free Supabase project.
2. In Supabase, open SQL Editor and run the SQL below.
3. In Project Settings -> API, copy the Project URL and the anon/public key.
4. Open the app and enter those two values once on each phone.
5. Install the site from Chrome on Android or Safari on iPhone.

SQL:

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  box integer not null check (box between 1 and 50),
  space integer not null check (space between 1 and 40),
  item_id text not null,
  description text,
  category text,
  price numeric default 0,
  sold_for numeric default 0,
  size text,
  condition text,
  listing_link text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.inventory enable row level security;

create policy "inventory_select" on public.inventory for select using (true);
create policy "inventory_insert" on public.inventory for insert with check (true);
create policy "inventory_update" on public.inventory for update using (true) with check (true);
create policy "inventory_delete" on public.inventory for delete using (true);

alter publication supabase_realtime add table public.inventory;

IMPORTANT SECURITY NOTE:
The simple policies above make the database writable to anyone who has your app's public anon key. For a real shared/private inventory, use Supabase Authentication and user-based RLS policies before putting sensitive information in the database. The app UI is ready to be extended with login.

The current app does NOT automatically import the old spreadsheet rows. You can add them through the app or import them later after confirming the spreadsheet's exact structure.
