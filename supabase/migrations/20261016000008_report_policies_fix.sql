-- SafeSphere · 0008 · votes/comments on approved reports
-- The 0004 policies checked `exists (select … from reports where status = 'approved')`, but that
-- subquery runs under the caller's RLS on `reports` (own rows + staff only), so nobody could
-- confirm or comment on someone else's approved report. Check approval through a definer function.

create or replace function public.is_report_public(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.reports where id = p_report_id and status = 'approved');
$$;

revoke execute on function public.is_report_public(uuid) from public, anon;
grant execute on function public.is_report_public(uuid) to authenticated;

drop policy report_votes_own on public.report_votes;
create policy report_votes_own on public.report_votes for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_report_public(report_id));

drop policy report_comments_insert on public.report_comments;
create policy report_comments_insert on public.report_comments for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_report_public(report_id));

drop policy report_comments_read on public.report_comments;
create policy report_comments_read on public.report_comments for select to authenticated
  using ((select public.is_staff()) or public.is_report_public(report_id));
