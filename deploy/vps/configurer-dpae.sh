#!/usr/bin/env bash
# Branche la DPAE automatique sur le compte Urssaf en ligne de Kivien (celui qui déclare pour les
# établissements sous mandat). Le mot de passe est demandé ici, saisi sans affichage, vérifié
# auprès de l'Urssaf, et rangé seulement dans /opt/kivien/supabase/.env.
#
# Usage : sudo deploy/vps/configurer-dpae.sh           (envois réels)
#         sudo deploy/vps/configurer-dpae.sh essai     (mode d'essai de l'Urssaf : fichiers contrôlés,
#                                                       aucune embauche enregistrée)
#         sudo deploy/vps/configurer-dpae.sh arret     (retire le compte : plus aucun envoi)
set -euo pipefail

MODE=${1:-reel}
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}

regler() {
  python3 - "$ICI/.env" "$1" "$2" <<'PY'
import sys
chemin, cle, valeur = sys.argv[1:]
lignes = [l for l in open(chemin).read().splitlines() if not l.startswith(cle + "=")]
if valeur:
    lignes.append(f"{cle}={valeur}")
open(chemin, "w").write("\n".join(lignes) + "\n")
PY
}

if [ "$MODE" = arret ]; then
  for cle in DPAE_SIRET DPAE_NOM DPAE_PRENOM DPAE_MOT_DE_PASSE DPAE_ESSAI; do regler "$cle" ""; done
  echo "Compte Urssaf retiré : la DPAE automatique n'envoie plus rien."
  exit 0
fi

echo "Compte Urssaf en ligne de Kivien (urssaf.fr, rubrique Mon profil : nom et prénom tels qu'ils y figurent)."
read -rp "SIRET du compte (14 chiffres) : " SIRET
SIRET=${SIRET//[[:space:]]/}
[[ "$SIRET" =~ ^[0-9]{14}$ ]] || { echo "SIRET invalide : rien n'a changé." >&2; exit 1; }
read -rp "Nom : " NOM
read -rp "Prénom : " PRENOM
read -rsp "Mot de passe (saisie masquée) : " MOT_DE_PASSE
echo
[ -n "$NOM" ] && [ -n "$PRENOM" ] && [ -n "$MOT_DE_PASSE" ] || { echo "Champ vide : rien n'a changé." >&2; exit 1; }
SERVICE=$(grep -E '^DPAE_SERVICE=' "$ICI/.env" 2>/dev/null | tail -n1 | cut -d= -f2- || true)

# Vérification avant d'enregistrer : l'Urssaf doit délivrer un jeton avec ces identifiants.
if ! SIRET="$SIRET" NOM="$NOM" PRENOM="$PRENOM" MDP="$MOT_DE_PASSE" SERVICE="${SERVICE:-98}" python3 -I - <<'PY'
import os, sys, urllib.error, urllib.request
from xml.sax.saxutils import escape
e = lambda c: escape(os.environ[c])
corps = (f"<identifiants><siret>{e('SIRET')}</siret><nom>{e('NOM')}</nom><prenom>{e('PRENOM')}</prenom>"
         f"<motdepasse>{e('MDP')}</motdepasse><service>{e('SERVICE')}</service></identifiants>")
requete = urllib.request.Request("https://mon.urssaf.fr/authentifier_dpae", data=corps.encode(), method="POST",
                                 headers={"Content-Type": "application/xml", "User-Agent": "Kivien-DPAE"})
try:
    with urllib.request.urlopen(requete, timeout=30) as r:
        sys.exit(0 if r.status == 200 and r.read().strip() else 1)
except urllib.error.HTTPError as err:
    print(f"Réponse de l'Urssaf : code {err.code}", file=sys.stderr)
    sys.exit(1)
except Exception as err:
    print(f"Urssaf injoignable : {err}", file=sys.stderr)
    sys.exit(1)
PY
then
  echo "Identifiants refusés par l'Urssaf : rien n'a changé. Vérifier le SIRET, le nom, le prénom et le mot de passe," >&2
  echo "et que le compte a bien le service DPAE." >&2
  exit 1
fi

regler DPAE_SIRET "$SIRET"
regler DPAE_NOM "$NOM"
regler DPAE_PRENOM "$PRENOM"
regler DPAE_MOT_DE_PASSE "$MOT_DE_PASSE"
regler DPAE_ESSAI "$([ "$MODE" = essai ] && echo oui || true)"
unset MOT_DE_PASSE

if [ "$MODE" = essai ]; then
  echo "Compte accepté par l'Urssaf. Mode d'essai : les fichiers sont contrôlés, aucune embauche n'est enregistrée."
else
  echo "Compte accepté par l'Urssaf. Les DPAE des établissements sous mandat partent en réel."
fi
echo "Dernière étape : activer « DPAE automatique » dans l'espace admin de Kivien."
