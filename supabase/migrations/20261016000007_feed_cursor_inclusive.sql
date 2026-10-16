-- SafeSphere · 0007 · feed pagination cursor is inclusive (a report created at the cursor time was skipped)

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
    and r.created_at <= p_before
    and st_dwithin(r.location, st_makepoint(p_lng, p_lat)::geography, least(p_radius_m, 50000))
  order by r.created_at desc
  limit least(p_limit, 100);
$$;
