-- Onglet Messages : le mobile de chaque destinataire, pour écrire par WhatsApp ou SMS à ceux qui
-- n'ont pas d'adresse e-mail confirmée (les extras s'inscrivaient avec leur seul mobile).

drop function admin_destinataires(text);
create function admin_destinataires(p_public text)
returns table (utilisateur_id uuid, nom text, detail text, prenom text, email text, telephone text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  if p_public = 'extras' then
    return query
      select e.id, e.prenom || ' ' || e.nom, e.commune, e.prenom, email_confirme(e.id), e.telephone
      from extras e order by e.created_at desc, e.id;
  elsif p_public = 'etablissements' then
    return query
      select x.utilisateur_id, x.nom, x.detail, null::text, email_confirme(x.utilisateur_id),
             (select nullif('+' || u.phone, '+') from auth.users u where u.id = x.utilisateur_id)
      from (
        select distinct on (m.utilisateur_id) m.utilisateur_id, r.nom, r.commune as detail, r.created_at
        from membres m join restaurants r on r.id = m.restaurant_id
        order by m.utilisateur_id, (m.role = 'gerant') desc, r.created_at
      ) x
      order by x.created_at desc, x.utilisateur_id;
  else
    raise exception 'Public inconnu';
  end if;
end $$;

revoke execute on function admin_destinataires(text) from public, anon;
grant execute on function admin_destinataires(text) to authenticated;
