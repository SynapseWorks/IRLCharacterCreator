-- Initial production schema for IRL Character Creator.
-- Private-by-default: characters, imported products, builds, renders, and photos
-- are all scoped to the authenticated user.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  base_photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text,
  canonical_url text,
  affiliate_url text,
  merchant text,
  name text not null,
  brand text,
  category text not null check (category in ('hat','glasses','earrings','necklace','top','outerwear','bottoms','shoes','bag')),
  image_url text,
  price numeric(12,2) check (price is null or price >= 0),
  currency char(3),
  price_observed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builds (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  name text not null,
  background_preset text not null default 'blush-studio',
  makeup_preset text not null default 'natural',
  notes text,
  rendered_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.build_items (
  build_id uuid not null references public.builds(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  category text not null check (category in ('hat','glasses','earrings','necklace','top','outerwear','bottoms','shoes','bag')),
  notes text,
  primary key (build_id, category)
);

create table if not exists public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.builds(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','validating','rendering','storing','completed','failed','cancelled')),
  provider text,
  provider_request_id text,
  error_message text,
  estimated_cost numeric(12,4) check (estimated_cost is null or estimated_cost >= 0),
  actual_cost numeric(12,4) check (actual_cost is null or actual_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_user_id_idx on public.characters(user_id);
create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists builds_character_id_idx on public.builds(character_id);
create index if not exists build_items_product_id_idx on public.build_items(product_id);
create index if not exists render_jobs_build_id_idx on public.render_jobs(build_id);

create trigger characters_set_updated_at
before update on public.characters
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger builds_set_updated_at
before update on public.builds
for each row execute function public.set_updated_at();

create trigger render_jobs_set_updated_at
before update on public.render_jobs
for each row execute function public.set_updated_at();

alter table public.characters enable row level security;
alter table public.products enable row level security;
alter table public.builds enable row level security;
alter table public.build_items enable row level security;
alter table public.render_jobs enable row level security;

create policy "users own characters"
on public.characters for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users own products"
on public.products for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users own builds"
on public.builds for all to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = character_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.characters c
    where c.id = character_id and c.user_id = auth.uid()
  )
);

create policy "users own build items"
on public.build_items for all to authenticated
using (
  exists (
    select 1
    from public.builds b
    join public.characters c on c.id = b.character_id
    where b.id = build_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.builds b
    join public.characters c on c.id = b.character_id
    where b.id = build_id and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.products p
    where p.id = product_id and p.user_id = auth.uid()
  )
);

create policy "users own render jobs"
on public.render_jobs for all to authenticated
using (
  exists (
    select 1
    from public.builds b
    join public.characters c on c.id = b.character_id
    where b.id = build_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.builds b
    join public.characters c on c.id = b.character_id
    where b.id = build_id and c.user_id = auth.uid()
  )
);

-- Private storage. Object names must start with the user's auth UID, e.g.
-- <user-id>/<character-id>/original.webp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'base-photos',
  'base-photos',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'renders',
  'renders',
  false,
  20971520,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "users manage own base photos"
on storage.objects for all to authenticated
using (
  bucket_id = 'base-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'base-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users manage own renders"
on storage.objects for all to authenticated
using (
  bucket_id = 'renders'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'renders'
  and (storage.foldername(name))[1] = auth.uid()::text
);
