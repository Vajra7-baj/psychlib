-- Auth, roles, and account-synced bookmarks.
--  * Only @mail.fresnostate.edu / @fresnostate.edu addresses may register.
--  * A profile is auto-created on signup; faculty are set from an allowlist.
--  * Faculty can add/edit/delete; everyone signed in can read + bookmark.
--  * Taxonomy trimmed to courses only.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) Trim taxonomy to courses (drops NASP domains + populations)
-- ---------------------------------------------------------------------------
delete from public.tags where category in ('nasp_domain', 'population');

-- ---------------------------------------------------------------------------
-- 2) Faculty allowlist — emails here become faculty on signup
-- ---------------------------------------------------------------------------
create table if not exists public.faculty_allowlist (email text primary key);
insert into public.faculty_allowlist (email) values
  ('kellycarrasco@mail.fresnostate.edu')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3) Restrict signups + auto-create profile with the right role
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  domain text := lower(split_part(new.email, '@', 2));
  is_fac boolean;
begin
  if domain not in ('mail.fresnostate.edu', 'fresnostate.edu') then
    raise exception 'Registration is limited to Fresno State (@mail.fresnostate.edu) email addresses.';
  end if;

  select exists (
    select 1 from public.faculty_allowlist f where lower(f.email) = lower(new.email)
  ) into is_fac;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when is_fac then 'faculty' else 'student' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4) Role helper
-- ---------------------------------------------------------------------------
create or replace function public.is_faculty()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'faculty'
  );
$$;

-- ---------------------------------------------------------------------------
-- 5) Replace dev-open policies with authenticated read + faculty write
-- ---------------------------------------------------------------------------
-- resources
drop policy if exists "read resources" on public.resources;
drop policy if exists "dev write resources" on public.resources;
create policy "read resources" on public.resources
  for select to authenticated using (true);
create policy "faculty write resources" on public.resources
  for all to authenticated using (public.is_faculty()) with check (public.is_faculty());

-- tags
drop policy if exists "read tags" on public.tags;
drop policy if exists "dev write tags" on public.tags;
create policy "read tags" on public.tags
  for select to authenticated using (true);
create policy "faculty write tags" on public.tags
  for all to authenticated using (public.is_faculty()) with check (public.is_faculty());

-- resource_tags
drop policy if exists "read resource_tags" on public.resource_tags;
drop policy if exists "dev write resource_tags" on public.resource_tags;
create policy "read resource_tags" on public.resource_tags
  for select to authenticated using (true);
create policy "faculty write resource_tags" on public.resource_tags
  for all to authenticated using (public.is_faculty()) with check (public.is_faculty());

-- profiles
drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles
  for select to authenticated using (true);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid());

-- bookmarks (each user manages only their own)
drop policy if exists "dev write bookmarks" on public.bookmarks;
drop policy if exists "own bookmarks read" on public.bookmarks;
drop policy if exists "own bookmarks write" on public.bookmarks;
create policy "own bookmarks read" on public.bookmarks
  for select to authenticated using (user_id = auth.uid());
create policy "own bookmarks write" on public.bookmarks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- storage: keep public read (so PDF previews load); writes faculty-only
drop policy if exists "read resource files" on storage.objects;
drop policy if exists "dev write resource files" on storage.objects;
drop policy if exists "faculty write resource files" on storage.objects;
create policy "read resource files" on storage.objects
  for select using (bucket_id = 'resources');
create policy "faculty write resource files" on storage.objects
  for all to authenticated
  using (bucket_id = 'resources' and public.is_faculty())
  with check (bucket_id = 'resources' and public.is_faculty());
