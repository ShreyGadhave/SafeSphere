-- SafeSphere · 0011 · server-side "phone went silent" detection for trips (PLAN §3.4)
-- The phone updates trips.last_heartbeat_at about every 30 s while a trip is active. If an active
-- trip stays silent for 5 minutes (phone switched off, smashed, no signal), the server creates a
-- `heartbeat_lost` alert at the last known point. The alert-insert trigger from 0009 then pushes
-- the user's contacts who use SafeSphere and nearby guardians; the admin dashboard shows it live.

create extension if not exists pg_cron;

create or replace function public.escalate_silent_trips()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  t record;
  new_alert uuid;
  n integer := 0;
begin
  for t in
    select tr.*
    from public.trips tr
    where tr.status = 'active'
      and coalesce(tr.last_heartbeat_at, tr.started_at) < now() - interval '5 minutes'
      and not exists (
        select 1 from public.alerts a where a.trip_id = tr.id and a.trigger_source = 'heartbeat_lost'
      )
    for update skip locked
  loop
    insert into public.alerts (user_id, trip_id, trigger_source, emergency_type, city, location)
    values (
      t.user_id, t.id, 'heartbeat_lost', 'unknown', t.city,
      (select p.location from public.trip_points p where p.trip_id = t.id order by p.recorded_at desc limit 1)
    )
    returning id into new_alert;

    insert into public.trip_anomalies (trip_id, kind, score, details, user_response, alert_id)
    values (t.id, 'gps_silent', 1,
            jsonb_build_object('silent_since', coalesce(t.last_heartbeat_at, t.started_at)),
            'no_response', new_alert);

    update public.trips set status = 'escalated' where id = t.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.escalate_silent_trips() from public, anon, authenticated;

select cron.schedule('safesphere-silent-trips', '* * * * *', 'select public.escalate_silent_trips()');
