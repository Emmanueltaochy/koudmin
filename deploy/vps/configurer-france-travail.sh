#!/usr/bin/env bash
# Branche le relevé La Bonne Boite (deploy/vps/offres-france-travail.sh) sur l'application
# francetravail.io de Kivien. L'identifiant et la clé secrète sont demandés ici (clé saisie sans
# affichage), vérifiés auprès de France Travail, et rangés seulement dans /opt/kivien/supabase/.env.
#
# Usage : sudo deploy/vps/configurer-france-travail.sh
set -euo pipefail
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}

regler() {
  python3 - "$ICI/.env" "$1" "$2" <<'PY'
import sys
chemin, cle, valeur = sys.argv[1:]
lignes = [l for l in open(chemin).read().splitlines() if not l.startswith(cle + "=")]
lignes.append(f"{cle}={valeur}")
open(chemin, "w").write("\n".join(lignes) + "\n")
PY
}

echo "Application francetravail.io de Kivien (Mon espace, Mes applications) : identifiant client et clé secrète."
read -rp "Identifiant client : " ID
read -rsp "Clé secrète (saisie masquée) : " SECRET
echo
[ -n "$ID" ] && [ -n "$SECRET" ] || { echo "Champ vide : rien n'a changé." >&2; exit 1; }

if ! ID="$ID" SECRET="$SECRET" python3 -I - <<'PY'
import os, sys, urllib.error, urllib.parse, urllib.request
for portee in ("api_labonneboitev2", "api_labonneboitev2 search office"):
    corps = urllib.parse.urlencode({"grant_type": "client_credentials", "client_id": os.environ["ID"],
                                    "client_secret": os.environ["SECRET"], "scope": portee}).encode()
    req = urllib.request.Request("https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
                                 data=corps, method="POST", headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            if r.status == 200:
                sys.exit(0)
    except urllib.error.HTTPError as err:
        print(f"Réponse de France Travail : code {err.code}", file=sys.stderr)
    except Exception as err:
        print(f"France Travail injoignable : {err}", file=sys.stderr)
        sys.exit(1)
sys.exit(1)
PY
then
  echo "Identifiants refusés : rien n'a changé. Vérifier l'identifiant, la clé, et que l'API « La Bonne Boite v2 » est ajoutée à l'application." >&2
  exit 1
fi

regler FT_CLIENT_ID "$ID"
regler FT_CLIENT_SECRET "$SECRET"
unset SECRET
echo "Identifiants acceptés par France Travail. Premier relevé La Bonne Boite :"
"${KIVIEN_OFFRES:-/usr/local/sbin/kivien-offres}" || echo "Relevé à relancer : sudo kivien-offres"
