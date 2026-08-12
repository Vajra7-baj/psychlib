-- Suggest-a-resource pipeline, account bookmarks, and search filtering.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) Suggestion status on resources
-- ---------------------------------------------------------------------------
alter table public.resources
  add column if not exists status text not null default 'approved'
  check (status in ('approved', 'pending'));
create index if not exists resources_status_idx on public.resources (status);

-- Any signed-in user may submit a *pending* suggestion attributed to themselves.
drop policy if exists "suggest resources" on public.resources;
create policy "suggest resources" on public.resources for insert to authenticated
  with check (status = 'pending' and added_by = auth.uid());

-- Students see approved resources only; faculty see everything (incl. pending).
drop policy if exists "read resources" on public.resources;
create policy "read resources" on public.resources for select to authenticated
  using (status = 'approved' or public.is_faculty());

-- ---------------------------------------------------------------------------
-- 2) Main library search returns approved resources only
--    (the faculty queue reads pending directly). Recreated with a status
--    filter added to the WHERE clause.
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
  id uuid, title text, authors text[], year int, type text, url text,
  doi text, abstract text, file_path text, created_at timestamptz,
  rank real, total_count bigint
)
language sql stable as $$
  with q_ts as (
    select case when coalesce(trim(q), '') = '' then null
      else websearch_to_tsquery('english', q) end as query
  ),
  filtered as (
    select r.*,
      case when (select query from q_ts) is null then 0
           else ts_rank(r.search_vector, (select query from q_ts)) end as rank
    from public.resources r
    where r.status = 'approved'
      and ((select query from q_ts) is null
        or r.search_vector @@ (select query from q_ts))
      and (type_filter is null or r.type = type_filter)
      and (tag_ids is null or not exists (select 1 from unnest(tag_ids))
        or exists (select 1 from public.resource_tags rt
          where rt.resource_id = r.id and rt.tag_id = any (tag_ids)))
  )
  select f.id, f.title, f.authors, f.year, f.type, f.url, f.doi, f.abstract,
    f.file_path, f.created_at, f.rank, count(*) over () as total_count
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
-- 3) Account bookmarks (re-add own-row policies after the lockdown migration)
-- ---------------------------------------------------------------------------
drop policy if exists "own bookmarks read" on public.bookmarks;
drop policy if exists "own bookmarks write" on public.bookmarks;
create policy "own bookmarks read" on public.bookmarks
  for select to authenticated using (user_id = auth.uid());
create policy "own bookmarks write" on public.bookmarks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
