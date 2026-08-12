-- PsychLib — School Psychology Resource Library
-- Initial schema: profiles, resources, tags, bookmarks + full-text search + storage
--
-- Design notes:
--  * Full-text search is the headline feature. `resources.search_vector` is a
--    generated tsvector that weights title > authors > abstract > extracted PDF
--    text, so a query ranks a title match above a body match automatically.
--  * Taxonomy (courses, NASP domains, populations) lives in `tags` with a
--    `category` so the same faceting UI works for every dimension.
--  * RLS is enabled everywhere. For the MVP we use permissive dev policies
--    (anon read + write) so upload/search can be exercised before auth lands.
--    These are clearly marked DEV and get replaced when Supabase Auth
--    (restricted to @mail.fresnostate.edu) is wired in the next phase.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- trigram fuzzy matching for autocomplete

-- ---------------------------------------------------------------------------
-- profiles  (mirrors auth.users; role drives faculty vs student capabilities)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        text not null default 'student' check (role in ('faculty', 'student')),
  cohort_year int,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tags  (courses / NASP domains / populations / free topics)
-- ---------------------------------------------------------------------------
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  category   text not null default 'topic'
             check (category in ('course', 'nasp_domain', 'population', 'topic')),
  created_at timestamptz not null default now()
);

create index if not exists tags_category_idx on public.tags (category);

-- ---------------------------------------------------------------------------
-- resources
-- ---------------------------------------------------------------------------
create table if not exists public.resources (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  authors        text[] not null default '{}',
  year           int,
  type           text not null default 'pdf'
                 check (type in ('pdf', 'article', 'book', 'link')),
  url            text,
  doi            text,
  abstract       text,
  notes          text,
  file_path      text,        -- path within the `resources` storage bucket
  file_size      bigint,      -- bytes
  extracted_text text,        -- full text pulled from the PDF, feeds search
  added_by       uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Maintained by trigger (below), not a generated column: array_to_string is
  -- STABLE, which generated columns forbid. A trigger has no such restriction.
  search_vector  tsvector
);

create index if not exists resources_search_idx on public.resources using gin (search_vector);
create index if not exists resources_title_trgm_idx on public.resources using gin (title gin_trgm_ops);
create index if not exists resources_created_idx on public.resources (created_at desc);

-- Rebuild the weighted search vector + bump updated_at on every write.
-- Weights: title (A) > authors (B) > abstract (C) > extracted PDF text (D).
create or replace function public.resources_before_write()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.authors, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.abstract, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.extracted_text, '')), 'D');
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists resources_before_write on public.resources;
create trigger resources_before_write
  before insert or update on public.resources
  for each row execute function public.resources_before_write();

-- ---------------------------------------------------------------------------
-- resource_tags  (many-to-many)
-- ---------------------------------------------------------------------------
create table if not exists public.resource_tags (
  resource_id uuid not null references public.resources (id) on delete cascade,
  tag_id      uuid not null references public.tags (id) on delete cascade,
  primary key (resource_id, tag_id)
);

create index if not exists resource_tags_tag_idx on public.resource_tags (tag_id);

-- ---------------------------------------------------------------------------
-- bookmarks  (personal saves with custom label + collection)
-- ---------------------------------------------------------------------------
create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  label       text,
  collection  text,
  created_at  timestamptz not null default now(),
  unique (user_id, resource_id)
);

-- ---------------------------------------------------------------------------
-- Full-text search RPC: ranked results + total count for pagination
-- ---------------------------------------------------------------------------
create or replace function public.search_resources(
  q            text default '',
  tag_ids      uuid[] default null,
  type_filter  text default null,
  sort         text default 'relevance',
  lim          int default 30,
  off          int default 0
)
returns table (
  id          uuid,
  title       text,
  authors     text[],
  year        int,
  type        text,
  url         text,
  doi         text,
  abstract    text,
  file_path   text,
  created_at  timestamptz,
  rank        real,
  total_count bigint
)
language sql stable as $$
  with q_ts as (
    select case
      when coalesce(trim(q), '') = '' then null
      else websearch_to_tsquery('english', q)
    end as query
  ),
  filtered as (
    select r.*,
      case when (select query from q_ts) is null then 0
           else ts_rank(r.search_vector, (select query from q_ts))
      end as rank
    from public.resources r
    where
      ((select query from q_ts) is null
        or r.search_vector @@ (select query from q_ts))
      and (type_filter is null or r.type = type_filter)
      and (
        tag_ids is null
        or not exists (select 1 from unnest(tag_ids))  -- empty array = no filter
        or exists (
          select 1 from public.resource_tags rt
          where rt.resource_id = r.id and rt.tag_id = any (tag_ids)
        )
      )
  )
  select
    f.id, f.title, f.authors, f.year, f.type, f.url, f.doi, f.abstract,
    f.file_path, f.created_at, f.rank,
    count(*) over () as total_count
  from filtered f
  order by
    case when sort = 'relevance' then f.rank end desc nulls last,
    case when sort = 'newest'    then f.created_at end desc nulls last,
    case when sort = 'oldest'    then f.created_at end asc  nulls last,
    case when sort = 'title'     then f.title end asc nulls last,
    f.created_at desc
  limit lim offset off;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded PDFs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.tags          enable row level security;
alter table public.resources     enable row level security;
alter table public.resource_tags enable row level security;
alter table public.bookmarks     enable row level security;

-- Everyone can read the library and taxonomy.
create policy "read resources"     on public.resources     for select using (true);
create policy "read tags"          on public.tags          for select using (true);
create policy "read resource_tags" on public.resource_tags for select using (true);
create policy "read profiles"      on public.profiles      for select using (true);

-- DEV (MVP): allow anon writes so upload/search can be exercised pre-auth.
-- REPLACE with faculty-gated policies once Supabase Auth is wired.
create policy "dev write resources"     on public.resources     for all using (true) with check (true);
create policy "dev write tags"          on public.tags          for all using (true) with check (true);
create policy "dev write resource_tags" on public.resource_tags for all using (true) with check (true);
create policy "dev write bookmarks"     on public.bookmarks     for all using (true) with check (true);

-- Storage: public read, dev-open write (mirrors table policy; tighten with auth).
create policy "read resource files"  on storage.objects for select using (bucket_id = 'resources');
create policy "dev write resource files" on storage.objects for all
  using (bucket_id = 'resources') with check (bucket_id = 'resources');
