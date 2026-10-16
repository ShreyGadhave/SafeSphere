-- SafeSphere · 0003 · helper functions, triggers and RPCs

-- ─────────────────────────── Helpers ───────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'medical_cards', 'trips', 'alerts', 'reports', 'zones', 'safe_places']
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- Role checks used by RLS policies. SECURITY DEFINER so they can read profiles regardless of RLS.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_verified_guardian()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and guardian_status = 'verified'
  );
$$;

-- ─────────────────────────── Auth hook ───────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their own profile but not grant themselves a role or guardian verification.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;  -- service role / admins
  end if;
  if new.role is distinct from old.role then
    raise exception 'role can only be changed by an admin';
  end if;
  if new.guardian_status is distinct from old.guardian_status
     and not (old.guardian_status in ('none', 'revoked') and new.guardian_status = 'pending')
     and not (new.guardian_status = 'none') then
    raise exception 'guardian verification is done by an admin';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ─────────────────────────── Contacts ───────────────────────────

create or replace function public.enforce_contact_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.emergency_contacts where user_id = new.user_id) >= 5 then
    raise exception 'a maximum of 5 emergency contacts is allowed';
  end if;
  return new;
end;
$$;

create trigger emergency_contacts_limit
  before insert on public.emergency_contacts
  for each row execute function public.enforce_contact_limit();

-- ─────────────────────── Community counters ───────────────────────

create or replace function public.sync_report_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare rid uuid := coalesce(new.report_id, old.report_id);
begin
  if tg_table_name = 'report_votes' then
    update public.reports
      set confirmations = (select count(*) from public.report_votes where report_id = rid)
      where id = rid;
  else
    update public.reports
      set comment_count = (select count(*) from public.report_comments where report_id = rid)
      where id = rid;
  end if;
  return null;
end;
$$;

create trigger report_votes_counter
  after insert or delete on public.report_votes
  for each row execute function public.sync_report_counters();

create trigger report_comments_counter
  after insert or delete on public.report_comments
  for each row execute function public.sync_report_counters();

-- ─────────────────────────── Alerts ───────────────────────────

-- Every new alert gets a 'created' event; status changes are logged too.
create or replace function public.log_alert_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.alert_events (alert_id, kind, actor_id, payload)
    values (new.id, 'created', new.user_id,
            jsonb_build_object('trigger', new.trigger_source, 'type', new.emergency_type));
  elsif new.status is distinct from old.status then
    insert into public.alert_events (alert_id, kind, actor_id, payload)
    values (new.id, 'status_changed', auth.uid(),
            jsonb_build_object('from', old.status, 'to', new.status));
    if new.status <> 'active' and new.resolved_at is null then
      new.resolved_at := now();
      new.resolved_by := auth.uid();
    end if;
  end if;
  return new;
end;
$$;

create trigger alerts_log_insert
  after insert on public.alerts
  for each row execute function public.log_alert_changes();

create trigger alerts_log_update
  before update on public.alerts
  for each row execute function public.log_alert_changes();

-- ─────────────────────────── RPCs ───────────────────────────

-- Public live-location page: anyone holding the token sees the alert's latest position and trail.
create or replace function public.get_shared_alert(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'id', a.id,
    'status', a.status,
    'emergency_type', a.emergency_type,
    'started_at', a.created_at,
    'person', split_part(p.full_name, ' ', 1),
    'latest', (
      select jsonb_build_object(
        'lat', st_y(l.location::geometry), 'lng', st_x(l.location::geometry),
        'accuracy_m', l.accuracy_m, 'battery_pct', l.battery_pct, 'at', l.recorded_at)
      from public.alert_locations l
      where l.alert_id = a.id
      order by l.recorded_at desc
      limit 1
    ),
    'trail', coalesce((
      select jsonb_agg(jsonb_build_array(st_x(t.location::geometry), st_y(t.location::geometry)) order by t.recorded_at)
      from (
        select location, recorded_at from public.alert_locations
        where alert_id = a.id order by recorded_at desc limit 200
      ) t
    ), '[]'::jsonb)
  )
  from public.alerts a
  join public.profiles p on p.id = a.user_id
  where a.share_token = p_token
    and a.share_expires_at > now();
$$;

create or replace function public.get_shared_trip(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'id', t.id,
    'status', t.status,
    'mode', t.mode,
    'person', split_part(p.full_name, ' ', 1),
    'destination_name', t.destination_name,
    'destination', jsonb_build_object('lat', st_y(t.destination::geometry), 'lng', st_x(t.destination::geometry)),
    'expected_arrival_at', t.expected_arrival_at,
    'vehicle_plate', t.vehicle_plate,
    'vehicle_description', t.vehicle_description,
    'driver_name', t.driver_name,
    'latest', (
      select jsonb_build_object(
        'lat', st_y(pt.location::geometry), 'lng', st_x(pt.location::geometry), 'at', pt.recorded_at)
      from public.trip_points pt
      where pt.trip_id = t.id
      order by pt.recorded_at desc
      limit 1
    )
  )
  from public.trips t
  join public.profiles p on p.id = t.user_id
  where t.share_token = p_token
    and t.share_expires_at > now();
$$;

-- Verified guardians: active alerts within a radius of their position.
create or replace function public.nearby_active_alerts(p_lat double precision, p_lng double precision, p_radius_m integer default 5000)
returns table (
  alert_id uuid,
  emergency_type public.emergency_type,
  created_at timestamptz,
  distance_m double precision,
  lat double precision,
  lng double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select a.id, a.emergency_type, a.created_at,
         st_distance(a.location, st_makepoint(p_lng, p_lat)::geography) as distance_m,
         st_y(a.location::geometry), st_x(a.location::geometry)
  from public.alerts a
  where public.is_verified_guardian()
    and a.status = 'active'
    and a.user_id <> auth.uid()
    and a.location is not null
    and st_dwithin(a.location, st_makepoint(p_lng, p_lat)::geography, least(p_radius_m, 10000))
  order by distance_m
  limit 20;
$$;

create or replace function public.guardian_respond(p_alert_id uuid, p_status public.guardian_response_status, p_distance_m real default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_verified_guardian() then
    raise exception 'only verified guardians can respond';
  end if;
  if not exists (select 1 from public.alerts where id = p_alert_id and status = 'active') then
    raise exception 'alert is not active';
  end if;
  insert into public.guardian_responses (alert_id, guardian_id, status, distance_m, updated_at)
  values (p_alert_id, auth.uid(), p_status, p_distance_m, now())
  on conflict (alert_id, guardian_id)
  do update set status = excluded.status, distance_m = coalesce(excluded.distance_m, guardian_responses.distance_m), updated_at = now();

  if p_status in ('accepted', 'arrived') then
    insert into public.alert_events (alert_id, kind, actor_id, payload)
    values (p_alert_id,
            case p_status when 'accepted' then 'guardian_accepted'::public.alert_event_kind else 'guardian_arrived'::public.alert_event_kind end,
            auth.uid(), jsonb_build_object('distance_m', p_distance_m));
  end if;
end;
$$;

-- Community feed: approved reports near a point. Author is first name only, hidden when anonymous.
create or replace function public.nearby_reports(
  p_lat double precision, p_lng double precision,
  p_radius_m integer default 5000, p_limit integer default 50, p_before timestamptz default now()
)
returns table (
  id uuid,
  category public.report_category,
  description text,
  urgency public.urgency,
  address text,
  occurred_at timestamptz,
  created_at timestamptz,
  confirmations integer,
  comment_count integer,
  media_path text,
  author text,
  distance_m double precision,
  lat double precision,
  lng double precision,
  confirmed_by_me boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select r.id, r.category, r.description, r.ai_urgency, r.address, r.occurred_at, r.created_at,
         r.confirmations, r.comment_count, r.media_path,
         case when r.is_anonymous then null else split_part(p.full_name, ' ', 1) end,
         st_distance(r.location, st_makepoint(p_lng, p_lat)::geography),
         st_y(r.location::geometry), st_x(r.location::geometry),
         exists (select 1 from public.report_votes v where v.report_id = r.id and v.user_id = auth.uid())
  from public.reports r
  left join public.profiles p on p.id = r.user_id
  where auth.uid() is not null
    and r.status = 'approved'
    and r.duplicate_of is null
    and r.created_at < p_before
    and st_dwithin(r.location, st_makepoint(p_lng, p_lat)::geography, least(p_radius_m, 50000))
  order by r.created_at desc
  limit least(p_limit, 100);
$$;

create or replace function public.nearest_safe_places(
  p_lat double precision, p_lng double precision,
  p_kinds public.place_kind[] default null, p_limit integer default 10
)
returns table (
  id uuid, kind public.place_kind, name text, phone text, open_24h boolean,
  distance_m double precision, lat double precision, lng double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select s.id, s.kind, s.name, s.phone, s.open_24h,
         st_distance(s.location, st_makepoint(p_lng, p_lat)::geography),
         st_y(s.location::geometry), st_x(s.location::geometry)
  from public.safe_places s
  where auth.uid() is not null
    and (p_kinds is null or s.kind = any (p_kinds))
  order by s.location <-> st_makepoint(p_lng, p_lat)::geography
  limit least(p_limit, 50);
$$;

-- Heatmap tiles: risk cells inside a bounding box for one hour.
create or replace function public.risk_cells_in_bbox(
  p_min_lng double precision, p_min_lat double precision,
  p_max_lng double precision, p_max_lat double precision,
  p_hour smallint, p_day_type public.day_type
)
returns table (h3_index text, score real, lat double precision, lng double precision)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.h3_index, c.score, st_y(c.centroid::geometry), st_x(c.centroid::geometry)
  from public.risk_cells c
  where auth.uid() is not null
    and c.hour = p_hour
    and c.day_type = p_day_type
    and c.centroid && st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)::geography
  limit 20000;
$$;

-- Function grants: RPCs are callable by signed-in users; the two share pages also by anon.
revoke execute on function public.get_shared_alert(text) from public;
revoke execute on function public.get_shared_trip(text) from public;
grant execute on function public.get_shared_alert(text) to anon, authenticated;
grant execute on function public.get_shared_trip(text) to anon, authenticated;

revoke execute on function public.nearby_active_alerts(double precision, double precision, integer) from public, anon;
revoke execute on function public.guardian_respond(uuid, public.guardian_response_status, real) from public, anon;
revoke execute on function public.nearby_reports(double precision, double precision, integer, integer, timestamptz) from public, anon;
revoke execute on function public.nearest_safe_places(double precision, double precision, public.place_kind[], integer) from public, anon;
revoke execute on function public.risk_cells_in_bbox(double precision, double precision, double precision, double precision, smallint, public.day_type) from public, anon;
grant execute on function public.nearby_active_alerts(double precision, double precision, integer) to authenticated;
grant execute on function public.guardian_respond(uuid, public.guardian_response_status, real) to authenticated;
grant execute on function public.nearby_reports(double precision, double precision, integer, integer, timestamptz) to authenticated;
grant execute on function public.nearest_safe_places(double precision, double precision, public.place_kind[], integer) to authenticated;
grant execute on function public.risk_cells_in_bbox(double precision, double precision, double precision, double precision, smallint, public.day_type) to authenticated;
