-- Imite le minimum de Supabase : rôles, schéma auth, auth.uid(), publication realtime.
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create table auth.users (id uuid primary key, phone text, aud text, role text, encrypted_password text,
  phone_confirmed_at timestamptz, confirmation_token text, recovery_token text, email_change_token_new text,
  email_change text, phone_change text, phone_change_token text, email_change_token_current text, reauthentication_token text);
create schema extensions;
create extension pgcrypto schema extensions;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create publication supabase_realtime;
grant usage on schema public, auth to authenticated;
grant execute on function auth.uid() to authenticated;
