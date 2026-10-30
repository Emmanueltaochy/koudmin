-- Numéro de sécurité sociale facultatif : la DPAE se fait aussi avec la date et le lieu
-- de naissance. S'il est fourni, il reste vérifié (contrainte infos_contrat_nir_check).
alter table infos_contrat alter column nir drop not null;
