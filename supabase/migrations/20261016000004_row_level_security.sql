-- SafeSphere · 0004 · Row-Level Security
-- Principle: users reach only their own rows; staff (moderator/admin) can read everything and
-- moderate; guardians and the public share pages go through SECURITY DEFINER RPCs (0003),
-- never through broad table policies. The service-role key (ML API, Edge Functions) bypasses RLS.

alter table public.profiles           enable row level security;
alter table public.medical_cards      enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.push_tokens        enable row level security;
alter table public.trips              enable row level security;
alter table public.trip_points        enable row level security;
alter table public.trip_anomalies     enable row level security;
alter table public.alerts             enable row level security;
alter table public.alert_locations    enable row level security;
alter table public.alert_events       enable row level security;
alter table public.evidence           enable row level security;
alter table public.guardian_responses enable row level security;
alter table public.reports            enable row level security;
alter table public.report_votes       enable row level security;
alter table public.report_comments    enable row level security;
alter table public.safe_places        enable row level security;
alter table public.zones              enable row level security;
alter table public.risk_cells         enable row level security;
alter table public.model_registry     enable row level security;
alter table public.llm_cache          enable row level security;  -- no policies: service role only

-- ───────────────────────────── profiles ─────────────────────────────
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_update_admin on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ─────────────────── medical_cards / contacts / push ───────────────────
create policy medical_own on public.medical_cards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy medical_staff_read on public.medical_cards for select to authenticated
  using ((select public.is_staff()));

create policy contacts_own on public.emergency_contacts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy contacts_staff_read on public.emergency_contacts for select to authenticated
  using ((select public.is_staff()));

create policy push_tokens_own on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────────────────────────── trips ─────────────────────────────
create policy trips_own on public.trips for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy trips_staff_read on public.trips for select to authenticated
  using ((select public.is_staff()));

create policy trip_points_own_insert on public.trip_points for insert to authenticated
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));
create policy trip_points_read on public.trip_points for select to authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
  );

create policy trip_anomalies_own on public.trip_anomalies for all to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));
create policy trip_anomalies_staff_read on public.trip_anomalies for select to authenticated
  using ((select public.is_staff()));

-- ───────────────────────────── alerts ─────────────────────────────
create policy alerts_own_insert on public.alerts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy alerts_read on public.alerts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy alerts_update on public.alerts for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()))
  with check (user_id = (select auth.uid()) or (select public.is_staff()));

create policy alert_locations_own_insert on public.alert_locations for insert to authenticated
  with check (exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = (select auth.uid())));
create policy alert_locations_read on public.alert_locations for select to authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = (select auth.uid()))
  );

create policy alert_events_insert on public.alert_events for insert to authenticated
  with check (
    (select public.is_staff())
    or exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = (select auth.uid()))
  );
create policy alert_events_read on public.alert_events for select to authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = (select auth.uid()))
  );

create policy evidence_own_insert on public.evidence for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = (select auth.uid()))
  );
create policy evidence_read on public.evidence for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- Guardians write through guardian_respond(); they and the alert owner can read responses.
create policy guardian_responses_read on public.guardian_responses for select to authenticated
  using (
    guardian_id = (select auth.uid())
    or (select public.is_staff())
    or exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = (select auth.uid()))
  );

-- ───────────────────────────── community ─────────────────────────────
-- The feed is served by nearby_reports(); direct table reads are own rows + staff.
create policy reports_own_insert on public.reports for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy reports_read on public.reports for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy reports_staff_update on public.reports for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy reports_staff_delete on public.reports for delete to authenticated
  using ((select public.is_staff()));

create policy report_votes_own on public.report_votes for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.reports r where r.id = report_id and r.status = 'approved')
  );

create policy report_comments_insert on public.report_comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.reports r where r.id = report_id and r.status = 'approved')
  );
create policy report_comments_read on public.report_comments for select to authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.reports r where r.id = report_id and r.status = 'approved')
  );
create policy report_comments_delete on public.report_comments for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- ───────────────────────────── places / ML ─────────────────────────────
create policy safe_places_read on public.safe_places for select to authenticated using (true);
create policy safe_places_staff_write on public.safe_places for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy zones_read on public.zones for select to authenticated using (active or (select public.is_staff()));
create policy zones_staff_write on public.zones for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy risk_cells_read on public.risk_cells for select to authenticated using (true);

create policy model_registry_staff_read on public.model_registry for select to authenticated
  using ((select public.is_staff()));
