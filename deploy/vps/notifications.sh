#!/usr/bin/env bash
# Envoie les e-mails automatiques (file notifications_email, migration 20261031100000) depuis la
# boîte bonjour@kivien.re : alertes de nouvelles missions aux extras proches, « extra trouvé » et
# « contrat à signer », rappels de la veille. Le minuteur kivien-notifications.timer l'appelle
# chaque minute ; chaque passage programme aussi les rappels de la veille (à partir de 17 h).
#
# Textes : packages/core/src/textesNotifications.ts, repris mot pour mot ci-dessous (vérifié par
# packages/core/test/textesNotifications.test.ts).
#
# Installé en /usr/local/sbin/kivien-notifications. Usage manuel : sudo kivien-notifications
# Essais : KIVIEN_PSQL (autre accès à la base) et KIVIEN_NOTIF_DOSSIER (messages écrits en .eml
# dans ce dossier au lieu d'être envoyés), voir scripts/verifier-notifications.sh.
set -euo pipefail
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}
lire() { grep -E "^$1=" "$ICI/.env" 2>/dev/null | tail -n1 | cut -d= -f2-; }

if [ -z "${KIVIEN_NOTIF_DOSSIER:-}" ] && [ -z "$(lire SMTP_PASS || true)" ]; then
  echo "Boîte d'envoi non configurée (deploy/vps/configurer-email.sh) : rien à faire."
  exit 0
fi

SMTP_HOST=$(lire SMTP_HOST || true) SMTP_PORT=$(lire SMTP_PORT || true) SMTP_USER=$(lire SMTP_USER || true) \
SMTP_PASS=$(lire SMTP_PASS || true) SITE=$(lire SITE_URL || true) \
KIVIEN_PSQL=${KIVIEN_PSQL:-} KIVIEN_NOTIF_DOSSIER=${KIVIEN_NOTIF_DOSSIER:-} \
python3 -I - <<'PY'
import datetime, html, json, os, re, smtplib, ssl, subprocess, urllib.request
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

PAR_PASSAGE = 60
EDITEUR = "Kivien · Emmanuel TAOCHY EI · SIRET 884 270 604 00025 · 124 route des Canots, 97427 L'Étang-Salé"
site = os.environ.get("SITE") or "https://kivien.re"
app = "https://app.kivien.re"
boite = os.environ.get("SMTP_USER") or "bonjour@kivien.re"
dossier = os.environ.get("KIVIEN_NOTIF_DOSSIER")

TEXTES = {
    "nouvelle_mission": {
        "sujet": "Nouvelle mission près de chez toi : {poste}, {jour}",
        "paragraphes": [
            "Bonjour {prenom},",
            "{restaurant} cherche un extra à {commune} : {poste}, {jour}, de {horaire}. C’est à {distance} de chez toi.",
            "Ouvre l’app pour voir la mission et dire « mi lé la ». La première personne qui accepte a la mission.",
        ],
        "bouton": "Voir la mission",
        "pied": "Tu reçois ce message car les alertes de missions sont activées. Pour les couper : onglet Profil de l’app, rubrique Adresse e-mail.",
    },
    "extra_trouve": {
        "sujet": "Extra trouvé : {extra}, {jour}",
        "paragraphes": [
            "Bonjour {prenom},",
            "{extra} a accepté votre mission {poste} du {jour}, de {horaire}, chez {restaurant}.",
            "Il reste à signer le contrat d’extra, puis à faire la DPAE avant le début de la mission.",
        ],
        "bouton": "Signer le contrat",
        "pied": "Vous recevez ce message pour une mission de votre établissement sur Kivien.",
    },
    "contrat_a_signer": {
        "sujet": "Ton contrat du {jour} est à signer",
        "paragraphes": [
            "Bonjour {prenom},",
            "{restaurant} a signé ton contrat d’extra pour la mission {poste} du {jour}, de {horaire}.",
            "Signe-le à ton tour dans l’app, avant le début de la mission.",
        ],
        "bouton": "Signer mon contrat",
        "pied": "Tu reçois ce message pour une mission sur Kivien.",
    },
    "rappel_extra": {
        "sujet": "Demain : {poste} chez {restaurant}",
        "paragraphes": [
            "Bonjour {prenom},",
            "Petit rappel : demain, {jour}, mission {poste} chez {restaurant} à {commune}, de {horaire}.",
            "L’adresse et l’itinéraire sont dans l’app. Un empêchement ? Préviens au plus vite depuis l’app.",
        ],
        "bouton": "Voir ma mission",
        "pied": "Tu reçois ce message pour une mission sur Kivien.",
    },
    "rappel_pro": {
        "sujet": "Demain : {extra} en extra chez {restaurant}",
        "paragraphes": [
            "Bonjour {prenom},",
            "Rappel : demain, {jour}, {extra} sera en extra chez {restaurant} pour la mission {poste}, de {horaire}.",
            "Pensez à la DPAE si ce n’est pas encore fait.",
        ],
        "bouton": "Voir la mission",
        "pied": "Vous recevez ce message pour une mission de votre établissement sur Kivien.",
    },
    "dpae_a_faire": {
        "sujet": "DPAE à faire vous-même : {extra}, {jour}",
        "paragraphes": [
            "Bonjour {prenom},",
            "La DPAE de {extra} pour la mission {poste} du {jour}, de {horaire}, chez {restaurant}, n’a pas pu être envoyée automatiquement à l’Urssaf.",
            "Faites-la vous-même sur net-entreprises.fr avant le début de la mission. Le motif et les informations à reporter sont dans votre espace.",
        ],
        "bouton": "Voir la DPAE",
        "pied": "Vous recevez ce message pour une mission de votre établissement sur Kivien.",
    },
}
POSTES = {
    "serveur": "Service en salle",
    "barman": "Service au bar",
    "cuisine": "Cuisine",
    "commis": "Commis de cuisine",
    "plonge": "Plonge",
    "reception": "Réception",
    "etages": "Entretien des chambres",
    "animation": "Animation",
    "technique_spectacle": "Technique son et lumière",
    "montage_spectacle": "Montage et démontage de scène",
    "accueil_spectacle": "Accueil du public et billetterie",
    "demenagement": "Manutention de déménagement",
    "enquete": "Enquête et sondage de terrain",
    "fete_foraine": "Tenue de stand ou de manège forain",
    "entrepot_viande": "Manutention en entrepôt de viande",
    "reparation_navale": "Aide en réparation navale",
    "travaux_forestiers": "Travaux forestiers",
    "formation": "Intervention de formation",
    "autre": "Mission",
}

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre",
        "novembre", "décembre"]
NBSP = " "


def sql(requete, **variables):
    """Requête dans la base (variables passées à psql, jamais collées dans le SQL)."""
    cmd = (os.environ.get("KIVIEN_PSQL") or "docker exec -i supabase-db psql -h localhost -U postgres -d postgres").split()
    cmd += ["-v", "ON_ERROR_STOP=1", "-At", "-q"]
    for k, v in variables.items():
        cmd += ["-v", f"{k}={v}"]
    return subprocess.run(cmd, input=requete, text=True, capture_output=True, check=True).stdout.strip()


def heure(minutes):
    """Comme formatHeure (core/temps.ts) : « 19 h », « 19 h 30 », « minuit »."""
    t = minutes % 1440
    if t == 0:
        return "minuit"
    h, m = divmod(t, 60)
    return f"{h}{NBSP}h" if m == 0 else f"{h}{NBSP}h{NBSP}{m:02d}"


def jour_long(iso):
    d = datetime.date.fromisoformat(iso)
    q = "1er" if d.day == 1 else str(d.day)
    return f"{JOURS[d.weekday()]} {q} {MOIS[d.month - 1]}"


def distance(metres):
    if metres is None:
        return ""
    return f"{max(1, round(metres / 1000))}{NBSP}km"


def lien(n):
    """Bouton du message : l'app pour les extras, l'espace pour les établissements."""
    t = n["type"]
    if t == "nouvelle_mission" or t == "rappel_extra":
        return f"{app}/mission/{n['demande_id']}"
    if t == "contrat_a_signer":
        return f"{app}/contrat/{n['demande_id']}"
    if t == "extra_trouve" or t == "dpae_a_faire":
        return f"{site}/demandes/{n['demande_id']}/contrat?affectation={n['affectation_id']}"
    return f"{site}/demandes/{n['demande_id']}"


def remplir(texte, n):
    poste = (n.get("intitule") or "").strip() if n["poste"] == "autre" else ""
    valeurs = {
        "prenom": n.get("prenom") or "",
        "extra": n.get("prenom_extra") or "Votre extra",
        "restaurant": n["restaurant"],
        "commune": n["commune"],
        "poste": poste or POSTES.get(n["poste"], "Mission"),
        "jour": jour_long(n["jour"]),
        "horaire": f"{heure(n['debut'])} à {heure(n['fin'])}",
        "distance": distance(n.get("distance_metres")),
    }
    # Prénom inconnu (établissement sans responsable nommé) : « Bonjour, » plutôt que « Bonjour , ».
    if not valeurs["prenom"]:
        texte = texte.replace(" {prenom}", "")
    for k, v in valeurs.items():
        texte = texte.replace("{" + k + "}", v)
    return texte


def message(n):
    m = TEXTES[n["type"]]
    sujet = remplir(m["sujet"], n)
    paragraphes = [remplir(p, n) for p in m["paragraphes"]]
    url = lien(n)
    msg = EmailMessage()
    msg["From"] = formataddr(("Kivien", boite))
    msg["To"] = n["email"]
    msg["Subject"] = sujet[:1].upper() + sujet[1:]
    msg["Message-ID"] = make_msgid(domain=boite.split("@")[1])
    texte = "\n\n".join(paragraphes)
    msg.set_content(f"{texte}\n\n{m['bouton']} : {url}\n\nL'équipe Kivien\n\n--\n{m['pied']}\n{EDITEUR}\n")
    corps = "".join(f'<p style="margin:0 0 16px;">{html.escape(p)}</p>' for p in paragraphes)
    msg.add_alternative(f"""<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#FBF6EE;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF6EE;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#211C18;">
<tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;padding:28px 24px;">
<tr><td style="padding-bottom:20px;"><img src="{site}/email/kivien-logo-email.png" alt="kivien" height="24" width="58" style="display:block;height:24px;width:58px;border:0;"></td></tr>
<tr><td style="font-size:16px;line-height:1.55;color:#211C18;">{corps}</td></tr>
<tr><td style="padding-top:8px;"><a href="{html.escape(url)}" style="display:inline-block;background:#C2401E;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:16px;padding:14px 24px;border-radius:12px;">{html.escape(m['bouton'])}</a></td></tr>
<tr><td style="padding-top:24px;font-size:16px;color:#211C18;">L'équipe Kivien</td></tr>
</table>
<p style="max-width:560px;font-size:12px;line-height:1.5;color:#7A726B;margin:16px 0 0;">{html.escape(m['pied'])}<br>{html.escape(EDITEUR)}</p>
</td></tr></table></body></html>""", subtype="html")
    return msg


# Messages écrits depuis l'espace admin (onglet Messages) : textes du pied repris de
# packages/core/src/messagesAdmin.ts (vérifié par test).
PIEDS_MESSAGE = {
    "extras": "Tu reçois ce message car tu as un compte extra sur Kivien. Une question ? Réponds simplement à cet e-mail.",
    "etablissements": "Vous recevez ce message car votre établissement a un compte sur Kivien. Une question ? Répondez simplement à cet e-mail.",
}


def en_html(texte):
    """Texte libre → HTML simple : paragraphes séparés par une ligne vide, listes « - », liens."""
    blocs = []
    lien = lambda s: re.sub(r"(https?://[^\s<]+)", r'<a href="\1" style="color:#9E3215;">\1</a>', html.escape(s))
    for bloc in re.split(r"\n\s*\n", texte.strip()):
        lignes = [l.strip() for l in bloc.splitlines() if l.strip()]
        puces = [l for l in lignes if l.startswith("- ")]
        avant = [l for l in lignes if not l.startswith("- ")]
        if avant and (not puces or lignes.index(puces[0]) > 0):
            blocs.append(f'<p style="margin:0 0 16px;">{"<br>".join(lien(l) for l in avant)}</p>')
        if puces:
            items = "".join(f'<li style="margin:0 0 6px;">{lien(l[2:])}</li>' for l in puces)
            blocs.append(f'<ul style="margin:0 0 16px;padding-left:20px;">{items}</ul>')
    return "".join(blocs)


def message_admin(e):
    prenom = (e.get("prenom") or "").strip()
    remplir = lambda s: (s.replace("{prenom}", prenom) if prenom else s.replace(" {prenom}", "").replace("{prenom}", ""))
    sujet = remplir(e["sujet"])
    corps = remplir(e["message"])
    pied = PIEDS_MESSAGE.get(e["public"], PIEDS_MESSAGE["extras"])
    msg = EmailMessage()
    msg["From"] = formataddr(("Kivien", boite))
    msg["To"] = e["email"]
    msg["Reply-To"] = boite
    msg["Subject"] = sujet
    msg["Message-ID"] = make_msgid(domain=boite.split("@")[1])
    msg.set_content(f"{corps}\n\n--\n{pied}\n{EDITEUR}\n")
    msg.add_alternative(f"""<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#FBF6EE;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF6EE;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#211C18;">
<tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;padding:28px 24px;">
<tr><td style="padding-bottom:20px;"><img src="{site}/email/kivien-logo-email.png" alt="kivien" height="24" width="58" style="display:block;height:24px;width:58px;border:0;"></td></tr>
<tr><td style="font-size:16px;line-height:1.55;color:#211C18;">{en_html(corps)}</td></tr>
</table>
<p style="max-width:560px;font-size:12px;line-height:1.5;color:#7A726B;margin:16px 0 0;">{html.escape(pied)}<br>{html.escape(EDITEUR)}</p>
</td></tr></table></body></html>""", subtype="html")
    return msg


rappels = sql("select programmer_rappels();")
lot = json.loads(sql("select coalesce(json_agg(x), '[]') from prendre_notifications(:n) x;", n=PAR_PASSAGE))
lot_admin = json.loads(sql("select coalesce(json_agg(x), '[]') from prendre_envois_admin(:n) x;", n=PAR_PASSAGE))
if not lot and not lot_admin:
    if rappels not in ("", "0"):
        print(f"Notifications : {rappels} rappel(s) programmé(s).")
    raise SystemExit(0)

envoyes = echecs = telephones = 0
PUSH_URL = os.environ.get("KIVIEN_PUSH_URL") or "https://exp.host/--/api/v2/push/send"


def noter(fonction, n, erreur=None):
    if erreur is None:
        sql(f"select {fonction}(:id);", id=n["id"])
    else:
        sql(f"select {fonction}(:id, :'erreur');", id=n["id"], erreur=erreur)


def pousser(n):
    """Notification sur les téléphones du destinataire (service Expo). Renvoie le nombre d'appareils
    atteints ; les appareils qui n'ont plus l'app sont oubliés."""
    jetons = n.get("jetons") or []
    if not jetons:
        return 0
    m = TEXTES[n["type"]]
    titre = remplir(m["sujet"], n)
    corps = remplir(m["paragraphes"][1], n)
    chemin = lien(n).split("app.kivien.re", 1)[-1] if "app.kivien.re" in lien(n) else "/"
    messages = [{"to": j, "title": titre[:1].upper() + titre[1:], "body": corps, "sound": "default",
                 "data": {"url": chemin}} for j in jetons]
    if dossier:
        with open(os.path.join(dossier, f"push-{n['id']}.json"), "w", encoding="utf-8") as f:
            json.dump(messages, f, ensure_ascii=False)
        return len(jetons)
    requete = urllib.request.Request(PUSH_URL, data=json.dumps(messages).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(requete, timeout=20) as r:
            tickets = json.loads(r.read().decode()).get("data") or []
    except Exception as e:  # service injoignable : l'e-mail, s'il existe, part quand même
        print(f"Notification sur téléphone impossible : {e}")
        return 0
    atteints = 0
    for jeton, ticket in zip(jetons, tickets):
        if ticket.get("status") == "ok":
            atteints += 1
        elif (ticket.get("details") or {}).get("error") == "DeviceNotRegistered":
            sql("select oublier_jeton_push(:'jeton');", jeton=jeton)
    return atteints


def envoyer_tout(envoyer_mail):
    """envoyer_mail(message) envoie un e-mail (ou l'écrit en fichier pour les essais)."""
    global envoyes, echecs, telephones
    for n in lot:
        atteints = pousser(n)
        telephones += atteints
        erreur = None
        if n.get("email"):
            try:
                envoyer_mail(message(n), f"{n['id']}-{n['type']}.eml")
            except smtplib.SMTPRecipientsRefused:
                erreur = "Adresse refusée par le serveur de destination"
        elif not atteints:
            erreur = "Aucun téléphone joignable"
        if erreur and not atteints:
            noter("noter_notification", n, erreur)
            echecs += 1
        else:
            noter("noter_notification", n)
            envoyes += 1
    for n in lot_admin:
        try:
            envoyer_mail(message_admin(n), f"admin-{n['id']}.eml")
            noter("noter_envoi_admin", n)
            envoyes += 1
        except smtplib.SMTPRecipientsRefused:
            noter("noter_envoi_admin", n, "Adresse refusée par le serveur de destination")
            echecs += 1


if dossier:
    def ecrire(msg, nom):
        with open(os.path.join(dossier, nom), "wb") as f:
            f.write(bytes(msg))
    envoyer_tout(ecrire)
elif not any(n.get("email") for n in lot) and not lot_admin:
    envoyer_tout(lambda msg, nom: None)
else:
    with smtplib.SMTP_SSL(os.environ["SMTP_HOST"], int(os.environ.get("SMTP_PORT") or 465),
                          context=ssl.create_default_context(), timeout=30) as smtp:
        smtp.login(boite, os.environ["SMTP_PASS"])
        envoyer_tout(lambda msg, nom: smtp.send_message(msg))
print(f"Notifications : {envoyes} envoyée(s), {telephones} sur téléphone, {echecs} échec(s), {rappels or 0} rappel(s) programmé(s).")
PY
