-- SafeSphere · RLS / RPC smoke test
-- Runs entirely inside one transaction and ROLLS BACK — leaves no data behind.
-- Usage: psql <conn> -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke.sql
-- Any failed check raises an exception and aborts.

begin;

-- ── Fixtures (as postgres) ──────────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'aisha@test.local', '{"full_name": "Aisha Khan"}'),
  ('00000000-0000-4000-8000-00000000000b', 'rahul@test.local', '{"full_name": "Rahul Kumar"}');

do $$ begin
  assert (select count(*) from public.profiles where id in (
    '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b')) = 2,
    'profiles were not auto-created on sign-up';
  raise notice 'PASS profiles auto-created on sign-up';
end $$;

-- ── As user A (Aisha) ───────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

insert into public.emergency_contacts (user_id, name, phone, is_primary) values
  (auth.uid(), 'Mom',   '+919800000001', true),
  (auth.uid(), 'Rohan', '+919800000002', false),
  (auth.uid(), 'Priya', '+919800000003', false),
  (auth.uid(), 'Dad',   '+919800000004', false),
  (auth.uid(), 'Neha',  '+919800000005', false);

do $$ begin
  begin
    insert into public.emergency_contacts (user_id, name, phone) values (auth.uid(), 'Sixth', '+919800000006');
    raise exception 'contact limit not enforced';
  exception when others then
    if sqlerrm not like '%maximum of 5%' then raise; end if;
  end;
  raise notice 'PASS max 5 emergency contacts';

  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'self-promotion to admin was allowed';
  exception when others then
    if sqlerrm not like '%only be changed by an admin%' then raise; end if;
  end;
  raise notice 'PASS users cannot make themselves admin';
end $$;

insert into public.alerts (id, user_id, trigger_source, emergency_type, location)
values ('00000000-0000-4000-8000-0000000000a1', auth.uid(), 'button', 'medical',
        extensions.st_makepoint(72.8347, 19.1197)::extensions.geography);
insert into public.alert_locations (alert_id, location, accuracy_m, battery_pct)
values ('00000000-0000-4000-8000-0000000000a1', extensions.st_makepoint(72.8350, 19.1199)::extensions.geography, 6, 71);

insert into public.reports (id, user_id, category, description, location, is_anonymous)
values ('00000000-0000-4000-8000-0000000000c1', auth.uid(), 'harassment',
        'Group following people outside the station exit after 10 PM',
        extensions.st_makepoint(72.8360, 19.1190)::extensions.geography, true);

do $$ begin
  assert (select count(*) from public.alerts) = 1, 'owner cannot see own alert';
  assert (select count(*) from public.alert_events where alert_id = '00000000-0000-4000-8000-0000000000a1') = 1,
    'alert "created" event not logged';
  raise notice 'PASS owner sees own alert; created event logged';
end $$;

-- ── As user B (Rahul) — a stranger ──────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true);

do $$
declare n integer;
begin
  assert (select count(*) from public.alerts) = 0, 'stranger can read another user''s alert';
  assert (select count(*) from public.emergency_contacts) = 0, 'stranger can read another user''s contacts';
  assert (select count(*) from public.profiles) = 1, 'stranger can read other profiles';
  assert (select count(*) from public.reports) = 0, 'stranger can read pending reports';

  update public.alerts set status = 'resolved' where id = '00000000-0000-4000-8000-0000000000a1';
  get diagnostics n = row_count;
  assert n = 0, 'stranger could resolve another user''s alert';

  assert (select count(*) from public.nearby_active_alerts(19.12, 72.835)) = 0, 'non-guardian sees nearby alerts';
  assert (select count(*) from public.nearby_reports(19.12, 72.835)) = 0, 'pending report visible in feed';
  raise notice 'PASS strangers see nothing private; non-guardians get no alerts; pending reports hidden';
end $$;

-- ── Admin actions (as the service role, like the ML API / Edge Functions) ──
reset role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
do $$ begin
  update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-00000000000b';
  update public.profiles set role = 'user' where id = '00000000-0000-4000-8000-00000000000b';
  raise notice 'PASS service role can change roles';
end $$;
update public.profiles set guardian_status = 'verified' where id = '00000000-0000-4000-8000-00000000000b';
update public.reports set status = 'approved' where id = '00000000-0000-4000-8000-0000000000c1';
select set_config('test.token', (select share_token from public.alerts where id = '00000000-0000-4000-8000-0000000000a1'), true);

-- ── B as verified guardian ──────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true);

do $$ begin
  assert (select count(*) from public.nearby_active_alerts(19.12, 72.835)) = 1, 'guardian does not see nearby alert';
  assert (select count(*) from public.nearby_active_alerts(28.61, 77.21)) = 0, 'guardian sees alert from another city';
  perform public.guardian_respond('00000000-0000-4000-8000-0000000000a1', 'accepted', 400);

  assert (select count(*) from public.nearby_reports(19.12, 72.835)) = 1, 'approved report missing from feed';
  assert (select author from public.nearby_reports(19.12, 72.835) limit 1) is null, 'anonymous report exposes author';
  insert into public.report_votes (report_id, user_id) values ('00000000-0000-4000-8000-0000000000c1', auth.uid());
  assert (select confirmations from public.nearby_reports(19.12, 72.835) limit 1) = 1, 'confirmation counter not updated';
  raise notice 'PASS guardian radius search + respond; feed shows approved anonymous report; votes counted';
end $$;

-- ── Public share link (anon, no login) ──────────────────────────────
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
declare j jsonb;
begin
  assert (select count(*) from public.alerts) = 0, 'anon can read alerts table';
  j := public.get_shared_alert(current_setting('test.token'));
  assert j is not null, 'share link returned nothing';
  assert j ->> 'person' = 'Aisha', 'share link should expose first name only';
  assert (j -> 'latest' ->> 'battery_pct')::int = 71, 'share link missing latest location';
  assert public.get_shared_alert('not-a-real-token') is null, 'bad token returned data';
  raise notice 'PASS share link works without login, first name only, bad tokens rejected';
end $$;

-- ── Back to A: guardian response visible to owner ───────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);
do $$ begin
  assert (select count(*) from public.guardian_responses) = 1, 'owner cannot see guardian response';
  assert (select count(*) from public.alert_events where kind = 'guardian_accepted') = 1, 'guardian event not logged';
  raise notice 'PASS owner sees guardian response and timeline event';
end $$;

reset role;
rollback;
