-- Suivi des campagnes de prospection : qui clique dans l'e-mail, ce qu'il visite sur kivien.re,
-- et s'il crée son compte. Le lien de l'e-mail (kivien.re/decouvrir/<jeton>) identifie l'envoi ;
-- le site garde ce jeton 30 jours dans le navigateur et note les pages vues.
-- Pas de mesure d'ouverture (image invisible) : peu fiable et soumise à consentement.

create table visites_prospection (
  id uuid primary key default gen_random_uuid(),
  envoi_id uuid not null references envois_prospection (id) on delete cascade,
  type text not null check (type in ('clic', 'page', 'inscription')),
  page text check (page is null or char_length(page) <= 200),
  restaurant_id uuid references restaurants (id) on delete set null,
  le timestamptz not null default now()
);
create index visites_par_envoi on visites_prospection (envoi_id, le);
alter table visites_prospection enable row level security;
revoke all on visites_prospection from anon, authenticated;

-- Appelée par le site (visiteur sans compte) : jeton inconnu ignoré, 300 visites au plus par envoi,
-- et une même page notée une fois par minute (rechargements).
create function noter_visite_prospection(p_jeton uuid, p_type text, p_page text)
returns void
language plpgsql security definer set search_path = public as $$
declare e uuid;
begin
  if p_type not in ('clic', 'page') then return; end if;
  select id into e from envois_prospection where jeton = p_jeton;
  if e is null then return; end if;
  if (select count(*) from visites_prospection where envoi_id = e) >= 300 then return; end if;
  if exists (select 1 from visites_prospection where envoi_id = e and type = p_type
             and page is not distinct from left(p_page, 200) and le > now() - interval '1 minute') then
    return;
  end if;
  insert into visites_prospection (envoi_id, type, page) values (e, p_type, left(p_page, 200));
end $$;

-- Après la création d'un compte établissement venu d'une campagne : lien fait une seule fois,
-- par le gérant de l'établissement créé.
create function noter_inscription_prospection(p_jeton uuid, p_restaurant uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare e uuid; p uuid;
begin
  if not est_gerant(p_restaurant) then return; end if;
  select id, prospect_id into e, p from envois_prospection where jeton = p_jeton;
  if e is null or exists (select 1 from visites_prospection where envoi_id = e and type = 'inscription') then return; end if;
  insert into visites_prospection (envoi_id, type, restaurant_id) values (e, 'inscription', p_restaurant);
  update prospects set statut = 'inscrit', maj_le = now() where id = p;
end $$;

-- Campagnes avec clics et comptes créés.
drop function admin_campagnes();
create function admin_campagnes()
returns table (id uuid, sujet text, cree_le timestamptz, total integer, envoyes integer, en_attente integer, echecs integer,
               annules integer, clics integer, inscriptions integer)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select c.id, c.sujet, c.cree_le, count(e.*)::integer,
           count(*) filter (where e.statut = 'envoye')::integer,
           count(*) filter (where e.statut = 'en_attente')::integer,
           count(*) filter (where e.statut = 'echoue')::integer,
           count(*) filter (where e.statut = 'annule')::integer,
           count(*) filter (where exists (select 1 from visites_prospection v where v.envoi_id = e.id and v.type = 'clic'))::integer,
           count(*) filter (where exists (select 1 from visites_prospection v where v.envoi_id = e.id and v.type = 'inscription'))::integer
    from campagnes c left join envois_prospection e on e.campagne_id = c.id
    group by c.id
    order by c.cree_le desc;
end $$;

-- Détail d'une campagne, établissement par établissement.
create function admin_suivi_campagne(p_campagne uuid)
returns table (envoi_id uuid, nom text, commune text, email text, statut text, envoye_le timestamptz, erreur text,
               premier_clic timestamptz, derniere_visite timestamptz, pages_vues integer, pages text[], inscrit_le timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select e.id, coalesce(p.nom, e.email), p.commune, e.email, e.statut, e.envoye_le, e.erreur,
           (select min(v.le) from visites_prospection v where v.envoi_id = e.id and v.type = 'clic'),
           (select max(v.le) from visites_prospection v where v.envoi_id = e.id),
           (select count(*)::integer from visites_prospection v where v.envoi_id = e.id and v.type = 'page'),
           (select array_agg(distinct v.page order by v.page) from visites_prospection v where v.envoi_id = e.id and v.type = 'page'),
           (select min(v.le) from visites_prospection v where v.envoi_id = e.id and v.type = 'inscription')
    from envois_prospection e
    left join prospects p on p.id = e.prospect_id
    where e.campagne_id = p_campagne
    order by (select max(v.le) from visites_prospection v where v.envoi_id = e.id) desc nulls last, p.nom;
end $$;

revoke execute on function noter_visite_prospection(uuid, text, text), noter_inscription_prospection(uuid, uuid),
  admin_campagnes(), admin_suivi_campagne(uuid) from public;
grant execute on function noter_visite_prospection(uuid, text, text) to anon, authenticated;
grant execute on function noter_inscription_prospection(uuid, uuid), admin_campagnes(), admin_suivi_campagne(uuid) to authenticated;
