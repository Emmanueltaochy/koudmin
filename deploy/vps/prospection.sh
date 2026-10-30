#!/usr/bin/env bash
# Envoie les e-mails des campagnes de prospection (espace admin, onglet Prospection) depuis la boîte
# bonjour@kivien.re, par petits lots : le minuteur kivien-prospection.timer l'appelle tous les quarts
# d'heure, du lundi au vendredi, de 8 h à 18 h à La Réunion.
#
# Plafond quotidien (PROSPECTION_PAR_JOUR dans .env, 40 par défaut) : une boîte qui envoie trop d'un
# coup finit en indésirables, et c'est la même boîte qui envoie les « mot de passe oublié ».
# Chaque message porte un lien de désinscription ; une adresse désinscrite n'est plus jamais écrite.
#
# Installé en /usr/local/sbin/kivien-prospection. Usage manuel : sudo kivien-prospection
set -euo pipefail
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}
lire() { grep -E "^$1=" "$ICI/.env" | tail -n1 | cut -d= -f2-; }

if [ -z "$(lire SMTP_PASS || true)" ]; then
  echo "Boîte d'envoi non configurée (deploy/vps/configurer-email.sh) : rien à faire."
  exit 0
fi

SMTP_HOST=$(lire SMTP_HOST) SMTP_PORT=$(lire SMTP_PORT) SMTP_USER=$(lire SMTP_USER) SMTP_PASS=$(lire SMTP_PASS) \
PAR_JOUR=$(lire PROSPECTION_PAR_JOUR || true) SITE=$(lire SITE_URL || true) \
python3 -I - <<'PY'
import html, json, os, re, smtplib, ssl, subprocess
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

PAR_LOT = 8
par_jour = int(os.environ.get("PAR_JOUR") or 40)
site = os.environ.get("SITE") or "https://kivien.re"
boite = os.environ["SMTP_USER"]


def sql(requete, **variables):
    """Requête dans la base (variables passées à psql, jamais collées dans le SQL)."""
    cmd = ["docker", "exec", "-i", "supabase-db", "psql", "-h", "localhost", "-U", "postgres", "-d", "postgres",
           "-v", "ON_ERROR_STOP=1", "-At", "-q"]
    for k, v in variables.items():
        cmd += ["-v", f"{k}={v}"]
    return subprocess.run(cmd, input=requete, text=True, capture_output=True, check=True).stdout.strip()


deja = int(sql("""select count(*) from envois_prospection
                  where statut = 'envoye' and envoye_le >= (jour_reunion()::timestamp at time zone 'Indian/Reunion');"""))
reste = min(PAR_LOT, par_jour - deja)
if reste <= 0:
    print(f"Plafond du jour atteint ({deja}/{par_jour}).")
    raise SystemExit(0)

lot = json.loads(sql("""
  select coalesce(json_agg(x), '[]') from (
    select e.id, e.email, e.jeton, c.sujet, c.message, p.nom, p.commune
    from envois_prospection e
    join campagnes c on c.id = e.campagne_id
    left join prospects p on p.id = e.prospect_id
    where e.statut = 'en_attente'
      and not exists (select 1 from desinscriptions_prospection d where d.email = lower(e.email))
    order by c.cree_le, e.id
    limit :n
  ) x;""", n=reste))
if not lot:
    print("Aucun e-mail en attente.")
    raise SystemExit(0)


def personnaliser(texte, e):
    return texte.replace("{nom}", e.get("nom") or "").replace("{commune}", e.get("commune") or "La Réunion")


def en_html(texte):
    """Texte de la campagne → HTML simple : paragraphes, listes « - », liens."""
    blocs = []
    for bloc in re.split(r"\n\s*\n", texte.strip()):
        lignes = [l.strip() for l in bloc.splitlines() if l.strip()]
        lien = lambda s: re.sub(r"(https?://[^\s<]+)", r'<a href="\1" style="color:#9E3215;">\1</a>', html.escape(s))
        if lignes and all(l.startswith("- ") for l in lignes):
            items = "".join(f'<li style="margin:0 0 6px;">{lien(l[2:])}</li>' for l in lignes)
            blocs.append(f'<ul style="margin:0 0 16px;padding-left:20px;">{items}</ul>')
        else:
            blocs.append(f'<p style="margin:0 0 16px;">{"<br>".join(lien(l) for l in lignes)}</p>')
    return "".join(blocs)


def message(e):
    desinscription = f"{site}/desinscription?j={e['jeton']}"
    corps = personnaliser(e["message"], e)
    pied = (f"Vous recevez ce message car {e.get('nom') or 'votre établissement'} est référencé publiquement "
            f"comme établissement à La Réunion. Pour ne plus recevoir nos messages : {desinscription}")
    m = EmailMessage()
    m["From"] = formataddr(("Kivien", boite))
    m["To"] = e["email"]
    m["Reply-To"] = boite
    m["Subject"] = personnaliser(e["sujet"], e)
    m["Message-ID"] = make_msgid(domain=boite.split("@")[1])
    m["List-Unsubscribe"] = f"<{desinscription}>, <mailto:{boite}?subject=desinscription>"
    m.set_content(f"{corps}\n\n--\nKivien · {boite} · {site}\n{pied}\n")
    m.add_alternative(f"""<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#FBF6EE;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF6EE;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#211C18;">
<tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;padding:28px 24px;">
<tr><td style="padding-bottom:20px;"><img src="{site}/email/kivien-logo-email.png" alt="kivien" height="24" width="58" style="display:block;height:24px;width:58px;border:0;"></td></tr>
<tr><td style="font-size:16px;line-height:1.55;color:#211C18;">{en_html(corps)}</td></tr>
<tr><td style="padding-top:8px;"><a href="{site}" style="display:inline-block;background:#C2401E;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:16px;padding:14px 24px;border-radius:12px;">Découvrir Kivien</a></td></tr>
</table>
<p style="max-width:560px;font-size:12px;line-height:1.5;color:#7A726B;margin:16px 0 0;">Kivien · <a href="mailto:{boite}" style="color:#7A726B;">{boite}</a> · <a href="{site}" style="color:#7A726B;">kivien.re</a><br>
{html.escape(pied.split(' Pour ne plus')[0])} <a href="{desinscription}" style="color:#7A726B;">Se désinscrire</a></p>
</td></tr></table></body></html>""", subtype="html")
    return m


envoyes = echecs = 0
with smtplib.SMTP_SSL(os.environ["SMTP_HOST"], int(os.environ["SMTP_PORT"] or 465),
                      context=ssl.create_default_context(), timeout=30) as smtp:
    smtp.login(boite, os.environ["SMTP_PASS"])
    for e in lot:
        try:
            smtp.send_message(message(e))
            sql("""update envois_prospection set statut = 'envoye', envoye_le = now(), erreur = null where id = :'id';
                   update prospects set statut = 'contacte', maj_le = now()
                    where id = (select prospect_id from envois_prospection where id = :'id') and statut = 'a_contacter';""",
                id=e["id"])
            envoyes += 1
        except smtplib.SMTPRecipientsRefused:
            sql("update envois_prospection set statut = 'echoue', erreur = :'erreur' where id = :'id';",
                id=e["id"], erreur="Adresse refusée par le serveur de destination")
            echecs += 1
print(f"Prospection : {envoyes} envoyé(s), {echecs} échec(s), {deja + envoyes}/{par_jour} aujourd'hui.")
PY
