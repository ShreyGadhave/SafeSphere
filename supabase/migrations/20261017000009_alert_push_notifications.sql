-- SafeSphere · 0009 · push notifications for new SOS alerts
-- Sends Expo push messages straight from the database (pg_net → Expo Push API, free, no key),
-- so it also fires for alerts that reach the server late through the phone's offline outbox.
--
-- Recipients:
--   • the user's emergency contacts who also use SafeSphere (matched on the last 10 phone
--     digits) — on INSERT only; they already got an SMS, the push is a second channel;
--   • verified, available guardians within 5 km whose position is < 30 min old — as soon as the
--     alert has a location (on INSERT, or on the update that first sets it).

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_alert_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  person      text;
  type_label  text;
  messages    jsonb;
  n_contacts  integer;
  n_guardians integer;
begin
  if new.status <> 'active' then
    return new;
  end if;
  if tg_op = 'UPDATE' and not (old.location is null and new.location is not null) then
    return new;
  end if;

  select coalesce(nullif(split_part(full_name, ' ', 1), ''), 'Someone') into person
  from public.profiles where id = new.user_id;
  type_label := case new.emergency_type when 'unknown' then 'Emergency' else initcap(new.emergency_type::text) end;

  create temporary table if not exists _push_targets (user_id uuid, role text, distance_m double precision)
    on commit drop;
  truncate _push_targets;

  if tg_op = 'INSERT' then
    insert into _push_targets (user_id, role)
    select distinct p.id, 'contact'
    from public.emergency_contacts c
    join public.profiles p
      on length(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g')) >= 10
     and right(regexp_replace(p.phone, '\D', '', 'g'), 10) = right(regexp_replace(c.phone, '\D', '', 'g'), 10)
    where c.user_id = new.user_id
      and p.id <> new.user_id;
  end if;

  if new.location is not null then
    insert into _push_targets (user_id, role, distance_m)
    select p.id, 'guardian', st_distance(p.last_location, new.location)
    from public.profiles p
    where p.guardian_status = 'verified'
      and p.guardian_available
      and p.id <> new.user_id
      and p.last_location is not null
      and p.last_location_at > now() - interval '30 minutes'
      and st_dwithin(p.last_location, new.location, 5000)
      and not exists (select 1 from _push_targets t where t.user_id = p.id);

    insert into public.guardian_responses (alert_id, guardian_id, status, distance_m)
    select new.id, user_id, 'notified', distance_m from _push_targets where role = 'guardian'
    on conflict (alert_id, guardian_id) do nothing;
  end if;

  select count(*) filter (where role = 'contact'), count(*) filter (where role = 'guardian')
  into n_contacts, n_guardians from _push_targets;

  select jsonb_agg(jsonb_build_object(
           'to', pt.token,
           'title', case t.role when 'guardian' then 'SOS nearby' else person || ' needs help' end,
           'body', case t.role
                     when 'guardian' then format('%s needs help %s m from you. Tap to respond.',
                                                 person, round(t.distance_m)::int)
                     else format('%s alert from %s. Check your SMS for the live location link.', type_label, person)
                   end,
           'data', jsonb_build_object('alertId', new.id, 'role', t.role),
           'channelId', 'sos',
           'priority', 'high',
           'sound', 'default'))
  into messages
  from (select * from _push_targets limit 100) t
  join public.push_tokens pt on pt.user_id = t.user_id;

  if messages is not null then
    perform net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      body    := messages,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json')
    );
    insert into public.alert_events (alert_id, kind, payload)
    values (new.id, 'push_sent',
            jsonb_build_object('messages', jsonb_array_length(messages),
                               'contacts', n_contacts, 'guardians', n_guardians));
  end if;

  return new;
end;
$$;

revoke execute on function public.notify_alert_push() from public, anon, authenticated;

create trigger alerts_notify_push
  after insert or update of location on public.alerts
  for each row execute function public.notify_alert_push();
