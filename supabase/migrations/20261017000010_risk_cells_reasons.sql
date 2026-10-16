-- SafeSphere · 0010 · heatmap RPC also returns SHAP reasons
-- Lets the app show "why this score" for the tapped/current cell without calling the ML API.

drop function if exists public.risk_cells_in_bbox(double precision, double precision, double precision, double precision, smallint, public.day_type);

create function public.risk_cells_in_bbox(
  p_min_lng double precision, p_min_lat double precision,
  p_max_lng double precision, p_max_lat double precision,
  p_hour smallint, p_day_type public.day_type
)
returns table (h3_index text, score real, lat double precision, lng double precision, reasons jsonb)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.h3_index, c.score, st_y(c.centroid::geometry), st_x(c.centroid::geometry), c.reasons
  from public.risk_cells c
  where auth.uid() is not null
    and c.hour = p_hour
    and c.day_type = p_day_type
    and c.centroid && st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)::geography
  limit 20000;
$$;

revoke execute on function public.risk_cells_in_bbox(double precision, double precision, double precision, double precision, smallint, public.day_type) from public, anon;
grant execute on function public.risk_cells_in_bbox(double precision, double precision, double precision, double precision, smallint, public.day_type) to authenticated;
