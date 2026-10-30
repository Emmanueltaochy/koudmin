#!/usr/bin/env bash
# Branche le paiement des frais Kivien : carte (Stripe) et prélèvement SEPA (GoCardless).
# Les clés sont demandées ici, saisies sans affichage, vérifiées auprès de Stripe et de GoCardless,
# puis rangées seulement dans /opt/kivien/supabase/.env. Laisser une clé vide garde l'actuelle.
#
# Usage : sudo deploy/vps/configurer-paiement.sh        (mode test : sk_test_…, bac à sable GoCardless)
#         sudo deploy/vps/configurer-paiement.sh reel   (vraies cartes et vrais prélèvements)
#
# Au passage en réel, seules les missions à partir d'aujourd'hui sont débitées : rien de la
# période d'essai n'est prélevé pour de vrai.
set -euo pipefail

MODE=${1:-test}
case "$MODE" in test | reel) ;; *) echo "Usage : $0 [test|reel]" >&2; exit 2 ;; esac
SOURCE=${KIVIEN_SOURCE:-/opt/kivien/source}
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}

lire() { grep -E "^$1=" "$ICI/.env" | tail -n1 | cut -d= -f2-; }
regler() {
  python3 - "$ICI/.env" "$1" "$2" <<'PY'
import sys
chemin, cle, valeur = sys.argv[1:]
lignes = open(chemin).read().splitlines()
for i, l in enumerate(lignes):
    if l.startswith(cle + "="):
        lignes[i] = f"{cle}={valeur}"
        break
else:
    lignes.append(f"{cle}={valeur}")
open(chemin, "w").write("\n".join(lignes) + "\n")
PY
}
psql_db() { docker exec -i supabase-db psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
# Appel HTTPS avec la clé passée par l'entrée standard (jamais dans la liste des processus).
appel() { printf 'header = "Authorization: Bearer %s"\n' "$1" | curl -fsS -K - --max-time 20 -o /dev/null "${@:2}"; }

if [ "$MODE" = reel ]; then prefixe=sk_live_; env_gc=live; hote_gc=https://api.gocardless.com
else prefixe=sk_test_; env_gc=sandbox; hote_gc=https://api-sandbox.gocardless.com; fi

echo "Paiements Kivien, mode $MODE."
echo "Stripe : Développeurs > Clés API > Clé secrète (commence par $prefixe). Entrée pour garder l'actuelle."
read -rsp "Clé secrète Stripe : " STRIPE
echo
if [ -n "$STRIPE" ]; then
  case "$STRIPE" in "$prefixe"*) ;; *) echo "Cette clé ne commence pas par $prefixe : rien n'a changé." >&2; exit 1 ;; esac
  appel "$STRIPE" https://api.stripe.com/v1/balance || { echo "Stripe refuse cette clé : rien n'a changé." >&2; exit 1; }
  echo "Clé Stripe acceptée."
fi

echo "GoCardless : Développeurs > Créer > Jeton d'accès (lecture et écriture). Entrée pour garder l'actuel."
read -rsp "Jeton GoCardless : " GOCARDLESS
echo
if [ -n "$GOCARDLESS" ]; then
  appel "$GOCARDLESS" -H 'GoCardless-Version: 2015-07-06' "$hote_gc/creditors" \
    || { echo "GoCardless refuse ce jeton (environnement $env_gc) : rien n'a changé." >&2; exit 1; }
  echo "Jeton GoCardless accepté ($env_gc)."
fi

if [ -n "$STRIPE" ]; then regler STRIPE_SECRET_KEY "$STRIPE"; fi
if [ -n "$GOCARDLESS" ]; then regler GOCARDLESS_ACCESS_TOKEN "$GOCARDLESS"; regler GOCARDLESS_ENV "$env_gc"; fi
unset STRIPE GOCARDLESS
if [ -z "$(lire STRIPE_SECRET_KEY || true)$(lire GOCARDLESS_ACCESS_TOKEN || true)" ]; then
  echo "Aucune clé enregistrée : rien n'a changé." >&2
  exit 1
fi

# Configuration et fonctions à jour depuis le dépôt, puis surcharge paiement ajoutée une fois.
cp "$SOURCE"/deploy/vps/supabase/docker-compose*.yml "$ICI/"
cp -r "$SOURCE/deploy/vps/supabase/volumes/functions/." "$ICI/volumes/functions/"
fichiers=$(lire COMPOSE_FILE)
case ":$fichiers:" in
  *:docker-compose.kivien-paiement.yml:*) ;;
  *) regler COMPOSE_FILE "$fichiers:docker-compose.kivien-paiement.yml" ;;
esac

# Point de départ des débits : remis à aujourd'hui à chaque changement de mode (test ↔ réel).
ancien=$(psql_db -At <<<"select mode_cles from reglages_paiement;")
if [ "$ancien" != "$MODE" ]; then
  psql_db -v mode="$MODE" <<<"update reglages_paiement set mode_cles = :'mode', debut = jour_reunion();"
  echo "Missions débitées à partir d'aujourd'hui (mode $MODE)."
fi

echo "Redémarrage du service des fonctions."
(cd "$ICI" && docker compose up -d --wait functions >/dev/null)
install -m 0700 "$SOURCE/deploy/vps/prelevements.sh" /usr/local/sbin/kivien-prelevements
echo "Premier passage des débits :"
/usr/local/sbin/kivien-prelevements
echo "Paiements activés (mode $MODE). Les gérants choisissent leur moyen sur https://kivien.re/paiement."
