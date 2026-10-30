-- Frais de mise en relation : 19 € HT à partir du 30 octobre 2026 (environ 20 % moins cher
-- que l'intérim). Taux horaire et TVA repris du paramètre en vigueur, inchangés.
-- Les demandes déjà publiées gardent les frais figés à leur publication.
insert into parametres (date_effet, taux_horaire_brut_centimes, frais_mise_en_relation_ht_centimes, tva_pour_mille)
select date '2026-10-30', p.taux_horaire_brut_centimes, 1900, p.tva_pour_mille
from parametres_en_vigueur(date '2026-10-30') p
where p.date_effet is not null
on conflict (date_effet) do update set frais_mise_en_relation_ht_centimes = excluded.frais_mise_en_relation_ht_centimes;
