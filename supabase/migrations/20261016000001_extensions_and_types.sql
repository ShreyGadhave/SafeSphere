-- SafeSphere · 0001 · extensions and enum types
-- Apply migrations in filename order (Supabase CLI does this automatically).

create extension if not exists postgis with schema extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.city as enum ('mumbai', 'navi_mumbai', 'delhi', 'pune');
create type public.user_role as enum ('user', 'moderator', 'admin');
create type public.guardian_status as enum ('none', 'pending', 'verified', 'revoked');

create type public.emergency_type as enum (
  'unknown', 'medical', 'accident', 'crime', 'harassment', 'fire', 'other'
);
create type public.alert_trigger as enum (
  'button',          -- SOS hold button
  'motion',          -- ML-4 fall / snatch
  'audio',           -- ML-3 scream / distress
  'shake',           -- shake-pattern fallback
  'ride_anomaly',    -- ML-5 Safe Ride check-in not answered
  'walk_checkin',    -- Safe Walk check-in not answered
  'checkin_timeout', -- "home in 20 min" timer expired
  'low_battery',     -- battery < 10% during a trip
  'heartbeat_lost'   -- server stopped receiving trip pings
);
create type public.alert_status as enum ('active', 'resolved', 'cancelled', 'false_alarm');
create type public.alert_event_kind as enum (
  'created', 'sms_sent', 'call_placed', 'push_sent', 'location_shared',
  'recording_uploaded', 'guardian_notified', 'guardian_accepted', 'guardian_arrived',
  'admin_note', 'status_changed', 'resolved'
);
create type public.evidence_kind as enum ('audio', 'photo', 'video');
create type public.guardian_response_status as enum ('notified', 'accepted', 'arrived', 'declined');

create type public.trip_mode as enum ('walk', 'ride');
create type public.trip_status as enum ('active', 'completed', 'cancelled', 'escalated');
create type public.anomaly_kind as enum (
  'off_route', 'unexpected_stop', 'heading_away', 'overdue', 'gps_silent'
);
create type public.anomaly_response as enum ('pending', 'ok', 'no_response', 'duress', 'sos');

create type public.report_category as enum (
  'harassment', 'theft', 'assault', 'accident', 'medical', 'fire',
  'infrastructure', 'suspicious', 'other'
);
create type public.report_status as enum ('pending', 'approved', 'rejected');
create type public.urgency as enum ('low', 'medium', 'high');

create type public.place_kind as enum ('police', 'hospital', 'pharmacy', 'fuel', 'metro', 'other');
create type public.zone_kind as enum ('safe', 'unsafe', 'watch');
create type public.day_type as enum ('weekday', 'weekend');
