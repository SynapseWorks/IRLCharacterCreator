-- Planned production schema for IRL Character Creator.
-- Apply only after Supabase/auth is connected.

create extension if not exists pgcrypto;

create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  base_photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  source_url text,
  merchant text,
  name text not null,
  brand text,
  category text not null,
  image_url text,
  price numeric(12,2),
  currency char(3),
  price_observed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists builds (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters(id) on delete cascade,
  name text not null,
  background_preset text not null default 'blush-studio',
  makeup_preset text not null default 'natural',
  rendered_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists build_items (
  build_id uuid not null references builds(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  category text not null,
  notes text,
  primary key (build_id, category)
);

create table if not exists render_jobs (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references builds(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','validating','rendering','storing','completed','failed','cancelled')),
  provider text,
  provider_request_id text,
  error_message text,
  estimated_cost numeric(12,4),
  actual_cost numeric(12,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table characters enable row level security;
alter table builds enable row level security;
alter table build_items enable row level security;
alter table render_jobs enable row level security;

create policy "users own characters" on characters for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own builds" on builds for all using (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid())) with check (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid()));
create policy "users own build items" on build_items for all using (exists (select 1 from builds b join characters c on c.id = b.character_id where b.id = build_id and c.user_id = auth.uid())) with check (exists (select 1 from builds b join characters c on c.id = b.character_id where b.id = build_id and c.user_id = auth.uid()));
create policy "users own render jobs" on render_jobs for all using (exists (select 1 from builds b join characters c on c.id = b.character_id where b.id = build_id and c.user_id = auth.uid())) with check (exists (select 1 from builds b join characters c on c.id = b.character_id where b.id = build_id and c.user_id = auth.uid()));
