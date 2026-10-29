-- Imite le minimum de Supabase : rôles, schéma auth, auth.uid(), publication realtime.
create role anon; create role authenticated;
create schema auth;
create table auth.users (id uuid primary key, phone text, aud text, role text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create publication supabase_realtime;
grant usage on schema public, auth to authenticated;
grant execute on function auth.uid() to authenticated;
