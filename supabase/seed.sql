-- SafeSphere · seed / admin bootstrap
-- Run after migrations. Safe places, zones and risk cells are loaded by the ML pipelines
-- (ml/src/safesphere_ml/...), not by hand.

-- Make yourself an admin after signing up once in the app or dashboard:
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
