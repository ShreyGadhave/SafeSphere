-- SafeSphere · 0002 · tables and indexes
-- All locations are geography(Point, 4326): (longitude, latitude), distances in metres.

-- ───────────────────────────── Users ─────────────────────────────

create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text not null default '',
  phone              text,
  city               public.city,
  avatar_path        text,
  role               public.user_role not null default 'user',
  guardian_status    public.guardian_status not null default 'none',
  -- Guardians only: position is stored while they are available to respond.
  guardian_available boolean not null default false,
  last_location      extensions.geography(Point, 4326),
  last_location_at   timestamptz,
  onboarded_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.profiles is 'One row per auth user. Safety PINs are never stored server-side.';

create table public.medical_cards (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  blood_group text check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  allergies   text,
  conditions  text,
  medications text,
  notes       text,
  updated_at  timestamptz not null default now()
);

create table public.emergency_contacts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  phone      text not null check (phone ~ '^\+?[0-9 ]{8,16}$'),
  relation   text,
  is_primary boolean not null default false,
  position   smallint not null default 0,
  created_at timestamptz not null default now()
);
create index emergency_contacts_user_idx on public.emergency_contacts (user_id);
create unique index emergency_contacts_one_primary on public.emergency_contacts (user_id) where is_primary;

create table public.push_tokens (
  token      text primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- ──────────────────────────── Journeys ────────────────────────────

create table public.trips (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  mode                public.trip_mode not null,
  status              public.trip_status not null default 'active',
  city                public.city,
  origin              extensions.geography(Point, 4326),
  destination         extensions.geography(Point, 4326) not null,
  destination_name    text,
  -- [{ "polyline": "<encoded>", "duration_s": 1080, "distance_m": 7400, "risk": 31 }, ...]
  expected_routes     jsonb not null default '[]'::jsonb,
  cab_provider        text,
  driver_name         text,
  vehicle_plate       text,
  vehicle_description text,
  share_text          text,            -- the text the user shared from the cab app
  expected_arrival_at timestamptz,
  last_heartbeat_at   timestamptz,
  share_token         text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  share_expires_at    timestamptz not null default now() + interval '12 hours',
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index trips_user_idx on public.trips (user_id, started_at desc);
create index trips_active_heartbeat_idx on public.trips (last_heartbeat_at) where status = 'active';

create table public.trip_points (
  id          bigint generated always as identity primary key,
  trip_id     uuid not null references public.trips (id) on delete cascade,
  location    extensions.geography(Point, 4326) not null,
  accuracy_m  real,
  speed_mps   real,
  heading_deg real,
  battery_pct smallint check (battery_pct between 0 and 100),
  recorded_at timestamptz not null default now()
);
create index trip_points_trip_idx on public.trip_points (trip_id, recorded_at);

create table public.trip_anomalies (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  kind          public.anomaly_kind not null,
  score         real check (score between 0 and 1),
  details       jsonb not null default '{}'::jsonb,
  user_response public.anomaly_response not null default 'pending',
  responded_at  timestamptz,
  alert_id      uuid,                   -- FK added after alerts exists
  created_at    timestamptz not null default now()
);
create index trip_anomalies_trip_idx on public.trip_anomalies (trip_id, created_at);

-- ───────────────────────────── SOS ─────────────────────────────

create table public.alerts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  trip_id            uuid references public.trips (id) on delete set null,
  emergency_type     public.emergency_type not null default 'unknown',
  trigger_source     public.alert_trigger not null,
  status             public.alert_status not null default 'active',
  is_duress          boolean not null default false,
  city               public.city,
  location           extensions.geography(Point, 4326),
  accuracy_m         real,
  address            text,
  battery_pct        smallint check (battery_pct between 0 and 100),
  -- {"audio": 0.88, "motion": 0.93, "anomaly": 0.91, "area_risk": 71}
  model_scores       jsonb not null default '{}'::jsonb,
  priority_score     smallint check (priority_score between 0 and 100),
  priority_breakdown jsonb,
  ai_summary         text,
  share_token        text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  share_expires_at   timestamptz not null default now() + interval '24 hours',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  resolved_by        uuid references public.profiles (id) on delete set null
);
create index alerts_user_idx on public.alerts (user_id, created_at desc);
create index alerts_status_idx on public.alerts (status, created_at desc);
create index alerts_location_idx on public.alerts using gist (location);

alter table public.trip_anomalies
  add constraint trip_anomalies_alert_fk
  foreign key (alert_id) references public.alerts (id) on delete set null;

create table public.alert_locations (
  id          bigint generated always as identity primary key,
  alert_id    uuid not null references public.alerts (id) on delete cascade,
  location    extensions.geography(Point, 4326) not null,
  accuracy_m  real,
  speed_mps   real,
  heading_deg real,
  battery_pct smallint check (battery_pct between 0 and 100),
  recorded_at timestamptz not null default now()
);
create index alert_locations_alert_idx on public.alert_locations (alert_id, recorded_at);

create table public.alert_events (
  id         bigint generated always as identity primary key,
  alert_id   uuid not null references public.alerts (id) on delete cascade,
  kind       public.alert_event_kind not null,
  actor_id   uuid references public.profiles (id) on delete set null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index alert_events_alert_idx on public.alert_events (alert_id, created_at);

create table public.evidence (
  id           uuid primary key default gen_random_uuid(),
  alert_id     uuid not null references public.alerts (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         public.evidence_kind not null,
  storage_path text not null unique,          -- evidence/<user_id>/<alert_id>/<chunk>.m4a
  sha256       text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  chunk_index  integer not null default 0,
  duration_s   real,
  size_bytes   bigint,
  recorded_at  timestamptz not null,
  created_at   timestamptz not null default now()
);
create index evidence_alert_idx on public.evidence (alert_id, chunk_index);

create table public.guardian_responses (
  alert_id    uuid not null references public.alerts (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  status      public.guardian_response_status not null default 'notified',
  distance_m  real,
  updated_at  timestamptz not null default now(),
  primary key (alert_id, guardian_id)
);
create index guardian_responses_guardian_idx on public.guardian_responses (guardian_id);
create index profiles_guardian_location_idx on public.profiles using gist (last_location)
  where guardian_status = 'verified' and guardian_available;

-- ─────────────────────────── Community ───────────────────────────

create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  -- Kept even for anonymous reports so moderators can act on abuse; never exposed in the feed.
  user_id       uuid references public.profiles (id) on delete set null,
  is_anonymous  boolean not null default false,
  category      public.report_category not null,
  description   text not null check (char_length(description) between 10 and 1000),
  city          public.city,
  location      extensions.geography(Point, 4326) not null,
  address       text,
  occurred_at   timestamptz not null default now(),
  media_path    text,
  status        public.report_status not null default 'pending',
  ai_category   public.report_category,
  ai_confidence real check (ai_confidence between 0 and 1),
  ai_urgency    public.urgency,
  toxicity      real check (toxicity between 0 and 1),
  duplicate_of  uuid references public.reports (id) on delete set null,
  embedding     extensions.vector(384),
  confirmations integer not null default 0,
  comment_count integer not null default 0,
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_location_idx on public.reports using gist (location);
create index reports_user_idx on public.reports (user_id);

create table public.report_votes (
  report_id  uuid not null references public.reports (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table public.report_comments (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.reports (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index report_comments_report_idx on public.report_comments (report_id, created_at);

-- ───────────────────────────── Places ─────────────────────────────

create table public.safe_places (
  id         uuid primary key default gen_random_uuid(),
  osm_id     bigint unique,
  kind       public.place_kind not null,
  name       text,
  city       public.city,
  location   extensions.geography(Point, 4326) not null,
  phone      text,
  open_24h   boolean,
  tags       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index safe_places_location_idx on public.safe_places using gist (location);
create index safe_places_kind_idx on public.safe_places (kind);

create table public.zones (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       public.zone_kind not null,
  city       public.city,
  area       extensions.geography(Polygon, 4326) not null,
  night_only boolean not null default false,
  note       text,
  active     boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index zones_area_idx on public.zones using gist (area);

-- ─────────────────────────────── ML ───────────────────────────────

-- ML-1 output: one score per H3 cell (res 9) × day type × hour, written by the ML pipeline.
create table public.risk_cells (
  h3_index      text not null,
  day_type      public.day_type not null,
  hour          smallint not null check (hour between 0 and 23),
  city          public.city not null,
  centroid      extensions.geography(Point, 4326) not null,
  score         real not null check (score between 0 and 100),
  -- [{"feature": "late_evening", "label": "Late evening", "impact": 18}, ...] (SHAP)
  reasons       jsonb not null default '[]'::jsonb,
  model_version text not null,
  updated_at    timestamptz not null default now(),
  primary key (h3_index, day_type, hour)
);
create index risk_cells_lookup_idx on public.risk_cells (city, day_type, hour);
create index risk_cells_centroid_idx on public.risk_cells using gist (centroid);

create table public.model_registry (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,              -- 'risk', 'audio', 'motion', 'anomaly', 'nlp', 'triage'
  version      text not null,
  metrics      jsonb not null default '{}'::jsonb,
  artifact_uri text,
  is_active    boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (name, version)
);
create unique index model_registry_one_active on public.model_registry (name) where is_active;

-- Groq response cache (written only by the ML service with the service-role key).
create table public.llm_cache (
  key         text primary key,            -- sha256 of the normalized prompt
  prompt_kind text not null,               -- 'alert_summary', 'report_label', ...
  model       text not null,
  output      text not null,
  hits        integer not null default 0,
  created_at  timestamptz not null default now()
);
