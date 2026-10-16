-- SafeSphere · 0012 · ML-8 alert triage score (computed in the database)
-- priority = 100 · sigmoid(z), z = bias + type + trigger + 2.0·model_confidence + 1.5·area_risk/100
--            + 0.8·night + 0.6·low_battery + 1.2·duress
-- Transparent weights (documented in docs/PLAN.md §6 / the report); every alert stores the
-- per-factor contributions in priority_breakdown so moderators can see *why* it is ranked there.
-- Runs on every insert and whenever the location, type, model scores or duress flag change.

create or replace function public.alert_triage_score(a public.alerts)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  ist        timestamp := (coalesce(a.created_at, now()) at time zone 'Asia/Kolkata');
  hour_ist   integer := extract(hour from ist)::int;
  day        public.day_type := case when extract(isodow from ist) >= 6 then 'weekend' else 'weekday' end;
  area_risk  real;
  model_conf real := 0;
  parts      jsonb;
  z          double precision;
begin
  if a.location is not null then
    select c.score into area_risk
    from public.risk_cells c
    where c.hour = hour_ist and c.day_type = day
      and st_dwithin(c.centroid, a.location, 700)
    order by c.centroid <-> a.location
    limit 1;
  end if;

  select coalesce(max(v::real), 0) into model_conf
  from jsonb_each_text(coalesce(a.model_scores, '{}'::jsonb)) as s(k, v)
  where k in ('audio', 'motion', 'anomaly') and v ~ '^[0-9.]+$';

  parts := jsonb_build_object(
    'bias', -2.0,
    'type', case a.emergency_type
              when 'medical' then 1.0 when 'fire' then 1.0 when 'crime' then 0.9
              when 'accident' then 0.9 when 'harassment' then 0.8 when 'unknown' then 0.5 else 0.3 end,
    'trigger', case a.trigger_source
              when 'button' then 1.0 when 'shake' then 0.8 when 'heartbeat_lost' then 0.8
              when 'motion' then 0.7 when 'audio' then 0.7 when 'ride_anomaly' then 0.6
              when 'walk_checkin' then 0.4 when 'checkin_timeout' then 0.4 else 0.2 end,
    'ai_confidence', round((2.0 * model_conf)::numeric, 2),
    'area_risk', round((1.5 * coalesce(area_risk, 50) / 100)::numeric, 2),
    'night', case when hour_ist >= 22 or hour_ist < 5 then 0.8 else 0 end,
    'low_battery', case when a.battery_pct is not null and a.battery_pct < 15 then 0.6 else 0 end,
    'duress', case when a.is_duress then 1.2 else 0 end
  );
  select sum(value::double precision) into z from jsonb_each_text(parts);
  return jsonb_build_object(
    'score', round(100 / (1 + exp(-z))),
    'parts', parts,
    'area_risk', area_risk
  );
end;
$$;

create or replace function public.set_alert_priority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb;
begin
  r := public.alert_triage_score(new);
  new.priority_score := (r ->> 'score')::smallint;
  new.priority_breakdown := r;
  if (r ->> 'area_risk') is not null then
    new.model_scores := coalesce(new.model_scores, '{}'::jsonb) || jsonb_build_object('area_risk', round((r ->> 'area_risk')::numeric));
  end if;
  return new;
end;
$$;

revoke execute on function public.alert_triage_score(public.alerts) from public, anon;
grant execute on function public.alert_triage_score(public.alerts) to authenticated;

create trigger alerts_set_priority
  before insert or update of location, emergency_type, model_scores, is_duress, trigger_source on public.alerts
  for each row execute function public.set_alert_priority();
