-- SafeSphere · 0005 · storage buckets and realtime
-- Object paths always start with the owner's user id: <bucket>/<user_id>/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('evidence',     'evidence',     false, 26214400, array['audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'image/jpeg', 'image/png', 'video/mp4']),
  ('report-media', 'report-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars',      'avatars',      true,  2097152,  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- evidence: owner uploads + reads own; staff reads all. No updates or deletes (tamper evidence).
create policy evidence_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy evidence_read_own_or_staff on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff())));

-- report-media: owner uploads; any signed-in user can read (served via signed URLs in the feed).
create policy report_media_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'report-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy report_media_read on storage.objects for select to authenticated
  using (bucket_id = 'report-media');
create policy report_media_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'report-media' and (select public.is_staff()));

-- avatars: public bucket for reads; owner writes.
create policy avatars_write_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Realtime: dashboard + app subscribe to these (RLS still applies to what each client receives).
alter publication supabase_realtime add table
  public.alerts,
  public.alert_locations,
  public.alert_events,
  public.guardian_responses,
  public.reports,
  public.trip_anomalies;
