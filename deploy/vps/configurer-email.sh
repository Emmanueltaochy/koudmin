#!/usr/bin/env bash
# Branche l'envoi des e-mails de Kivien sur la boîte bonjour@kivien.re (Hostinger) :
# confirmation d'adresse, mot de passe oublié. Le mot de passe de la boîte est demandé ici,
# saisi sans affichage, et rangé seulement dans /opt/kivien/supabase/.env.
#
# Usage : sudo deploy/vps/configurer-email.sh                (boîte bonjour@kivien.re)
#         sudo deploy/vps/configurer-email.sh autre@kivien.re
set -euo pipefail

BOITE=${1:-bonjour@kivien.re}
SOURCE=${KIVIEN_SOURCE:-/opt/kivien/source}
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}
HOTE_SMTP=smtp.hostinger.com
PORT_SMTP=465

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

read -rsp "Mot de passe de la boîte $BOITE : " MOT_DE_PASSE
echo
[ -n "$MOT_DE_PASSE" ] || { echo "Mot de passe vide : rien n'a changé." >&2; exit 1; }

# Vérification avant d'enregistrer : connexion au serveur d'envoi et message d'essai à la boîte elle-même.
if ! BOITE="$BOITE" MDP="$MOT_DE_PASSE" HOTE="$HOTE_SMTP" PORT="$PORT_SMTP" python3 - <<'PY'
import os, smtplib, ssl
from email.message import EmailMessage
m = EmailMessage()
m["From"] = f"Kivien <{os.environ['BOITE']}>"
m["To"] = os.environ["BOITE"]
m["Subject"] = "Kivien : envoi des e-mails activé"
m.set_content("Les e-mails de Kivien (confirmation d'adresse, mot de passe oublié) partent désormais de cette boîte.")
with smtplib.SMTP_SSL(os.environ["HOTE"], int(os.environ["PORT"]), context=ssl.create_default_context(), timeout=20) as s:
    s.login(os.environ["BOITE"], os.environ["MDP"])
    s.send_message(m)
PY
then
  echo "Connexion à $HOTE_SMTP refusée : vérifier le mot de passe de $BOITE (hPanel, E-mails)." >&2
  exit 1
fi
echo "Connexion réussie, message d'essai envoyé à $BOITE."

regler SMTP_HOST "$HOTE_SMTP"
regler SMTP_PORT "$PORT_SMTP"
regler SMTP_USER "$BOITE"
regler SMTP_PASS "$MOT_DE_PASSE"
regler SMTP_ADMIN_EMAIL "$BOITE"
regler SMTP_SENDER_NAME "Kivien"
regler ENABLE_EMAIL_SIGNUP true
regler ENABLE_EMAIL_AUTOCONFIRM false
regler ADDITIONAL_REDIRECT_URLS "https://kivien.re/**,https://app.kivien.re/**"
unset MOT_DE_PASSE

# Configuration à jour depuis le dépôt, puis surcharge e-mail ajoutée une fois.
cp "$SOURCE"/deploy/vps/supabase/docker-compose*.yml "$ICI/"
fichiers=$(lire COMPOSE_FILE)
case ":$fichiers:" in
  *:docker-compose.kivien-email.yml:*) ;;
  *) regler COMPOSE_FILE "$fichiers:docker-compose.kivien-email.yml" ;;
esac

echo "Redémarrage du service d'authentification."
(cd "$ICI" && docker compose up -d --wait auth >/dev/null)
echo "E-mails activés : confirmation d'adresse et mot de passe oublié partent de $BOITE."
