-- Ajout d'un établissement à la main dans l'espace prospection (absent d'OpenStreetMap, ou fiche
-- d'essai pour s'envoyer une campagne).

create function admin_ajouter_prospect(p_nom text, p_categorie text, p_commune text, p_telephone text, p_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  perform verifier_admin();
  if coalesce(btrim(p_nom), '') = '' then
    raise exception 'Nom obligatoire';
  end if;
  if normaliser_email(p_email) is not null and normaliser_email(p_email) !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then
    raise exception 'Adresse e-mail invalide';
  end if;
  insert into prospects (nom, categorie, commune, telephone, email, source_email)
  values (left(btrim(p_nom), 150),
          case when p_categorie in ('restaurant', 'bar', 'cafe', 'restauration_rapide', 'hotel', 'hebergement', 'nuit')
               then p_categorie else 'autre' end,
          nullif(btrim(p_commune), ''), nullif(btrim(p_telephone), ''), normaliser_email(p_email),
          case when normaliser_email(p_email) is not null then 'manuel' end)
  returning id into r;
  return r;
end $$;

revoke execute on function admin_ajouter_prospect(text, text, text, text, text) from public, anon;
grant execute on function admin_ajouter_prospect(text, text, text, text, text) to authenticated;
