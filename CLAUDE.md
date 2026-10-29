# Consignes pour Claude

- **Règle d'or : toujours répondre en français**, dans tous les messages, sans exception.
- Textes de l'interface : voir `packages/core/src/textes*.ts` et leurs tests (pas de « ! », pas d'émoji,
  formulations neutres, créole limité à kivien / péi / mi lé la, aucune mention d'âge).
- Taux horaire (SMIC) et frais : toujours lus dans la table `parametres`, jamais écrits en dur.
- Déploiement : chaque push sur `main` vérifie tout puis met à jour le VPS (voir `deploy/vps/README.md`).
