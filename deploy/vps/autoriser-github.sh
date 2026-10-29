#!/usr/bin/env bash
# À lancer une fois sur le VPS, en root : crée la clé SSH réservée au déploiement par GitHub Actions
# et affiche les secrets à copier dans GitHub (Settings, Secrets and variables, Actions).
#
# La clé ne peut rien faire d'autre que lancer kivien-mise-a-jour (commande forcée, ni terminal,
# ni redirection de ports). Relancer le script remplace la clé précédente.
#
# Usage : sudo /opt/kivien/source/deploy/vps/autoriser-github.sh
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "À lancer en root (sudo)." >&2; exit 1; }
ETIQUETTE=kivien-github-deploiement
ICI=$(cd "$(dirname "$0")" && pwd)

install -m 0700 "$ICI/mettre-a-jour.sh" /usr/local/sbin/kivien-mise-a-jour
[ -x /usr/local/sbin/kivien-sauvegarde ] || install -m 0700 "$ICI/sauvegarde.sh" /usr/local/sbin/kivien-sauvegarde

reglages=$(sshd -T 2>/dev/null || true)
if [ "$(awk '$1 == "permitrootlogin" {print $2}' <<<"$reglages")" = no ]; then
  echo "SSH refuse toute connexion root (PermitRootLogin no) : la clé de déploiement ne pourrait pas servir." >&2
  exit 1
fi
port=$(awk '$1 == "port" {print $2; exit}' <<<"$reglages")
port=${port:-22}

tmp=$(mktemp -d)
trap 'shred -u "$tmp"/cle 2>/dev/null || true; rm -rf "$tmp"' EXIT
ssh-keygen -q -t ed25519 -N '' -C "$ETIQUETTE" -f "$tmp/cle"

install -d -m 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
# Retire l'ancienne clé de déploiement, garde toutes les autres.
grep -v " $ETIQUETTE\$" /root/.ssh/authorized_keys > "$tmp/autorisees" || true
printf 'restrict,command="/usr/local/sbin/kivien-mise-a-jour" %s\n' "$(cat "$tmp/cle.pub")" >> "$tmp/autorisees"
cat "$tmp/autorisees" > /root/.ssh/authorized_keys

ip=$(ip -4 -o route get 1.1.1.1 | grep -oP 'src \K\S+')
cle_hote=$(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)

cat <<FIN

Clé de déploiement installée. Dans GitHub : dépôt, Settings, Secrets and variables, Actions,
bouton « New repository secret ». Créer ces 3 secrets (nom exact, valeur entre les lignes) :

VPS_HOTE
$ip

VPS_PORT
$port

VPS_CLE_SSH   (copier tout le bloc, lignes BEGIN et END comprises)
$(cat "$tmp/cle")

La clé privée ci-dessus n'est conservée nulle part sur le VPS : ne la colle que dans GitHub.

Clé publique de ce VPS, attendue dans deploy/vps/cle-hote-vps.pub du dépôt (à mettre à jour seulement
si le VPS est réinstallé) :
$cle_hote
Pour la révoquer : relancer ce script, ou retirer la ligne « $ETIQUETTE » de /root/.ssh/authorized_keys.
FIN
