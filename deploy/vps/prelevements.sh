#!/usr/bin/env bash
# Lance les débits des frais Kivien (fonction « prelevements ») : missions finies depuis 24 h,
# factures mensuelles, suivi des prélèvements SEPA. Appelé toutes les heures par le minuteur
# kivien-prelevements.timer ; sans clé de paiement configurée, ne fait rien.
#
# Installé en /usr/local/sbin/kivien-prelevements. Usage manuel : sudo kivien-prelevements
set -euo pipefail
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}
lire() { grep -E "^$1=" "$ICI/.env" | tail -n1 | cut -d= -f2-; }

if [ -z "$(lire STRIPE_SECRET_KEY || true)$(lire GOCARDLESS_ACCESS_TOKEN || true)" ]; then
  echo "Paiements non configurés (deploy/vps/configurer-paiement.sh) : rien à faire."
  exit 0
fi
port=$(lire KIVIEN_PORT_API)
# Clé de service passée par l'entrée standard : jamais visible dans la liste des processus.
printf 'header = "Authorization: Bearer %s"\nheader = "apikey: %s"\n' "$(lire SERVICE_ROLE_KEY)" "$(lire ANON_KEY)" \
  | curl -fsS -K - -X POST -H 'Content-Type: application/json' --max-time 300 \
    "http://127.0.0.1:$port/functions/v1/prelevements"
echo
