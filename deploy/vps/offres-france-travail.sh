#!/usr/bin/env bash
# Établissements qui recrutent en ce moment : offres d'emploi de La Réunion (974) publiées sur France
# Travail dans l'hôtellerie et la restauration, par l'API « Offres d'emploi » (francetravail.io).
# Chaque établissement est rapproché d'un prospect existant ou ajouté à la prospection, avec la date
# et l'intitulé de sa dernière offre (migration 20261121090000). Le minuteur kivien-offres.timer
# l'appelle chaque jour à 6 h 40 (La Réunion).
#
# Identifiants de l'application francetravail.io (jamais dans le dépôt) : FT_CLIENT_ID et
# FT_CLIENT_SECRET dans /opt/kivien/supabase/.env, rangés par deploy/vps/configurer-france-travail.sh.
# Installé en /usr/local/sbin/kivien-offres. Usage manuel : sudo kivien-offres
# Essais : KIVIEN_PSQL (autre accès à la base) et KIVIEN_FT_URL (faux service), voir scripts/verifier-offres.sh.
set -euo pipefail
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}
lire() { grep -E "^$1=" "$ICI/.env" 2>/dev/null | tail -n1 | cut -d= -f2-; }

if [ -z "$(lire FT_CLIENT_SECRET || true)" ]; then
  echo "Application France Travail non configurée (deploy/vps/configurer-france-travail.sh) : rien à faire."
  exit 0
fi

FT_CLIENT_ID=$(lire FT_CLIENT_ID || true) FT_CLIENT_SECRET=$(lire FT_CLIENT_SECRET || true) \
KIVIEN_PSQL=${KIVIEN_PSQL:-} KIVIEN_FT_URL=${KIVIEN_FT_URL:-} \
python3 -I - <<'PY'
import json, os, re, subprocess, time, urllib.error, urllib.parse, urllib.request

faux = os.environ.get("KIVIEN_FT_URL")
URL_JETON = (faux or "https://entreprise.francetravail.fr") + "/connexion/oauth2/access_token?realm=%2Fpartenaire"
URL_OFFRES = (faux or "https://api.francetravail.io") + "/partenaire/offresdemploi/v2/offres/search"
# Métiers (codes ROME) : cuisine, restauration polyvalente, plonge, bar, service en salle,
# entretien des chambres, réception d'hôtel.
METIERS = ["G1602", "G1603", "G1605", "G1801", "G1803", "G1501", "G1703"]
PAR_PAGE = 150
PAGES_MAX = 6


def sql(requete, **variables):
    cmd = (os.environ.get("KIVIEN_PSQL") or "docker exec -i supabase-db psql -h localhost -U postgres -d postgres").split()
    cmd += ["-v", "ON_ERROR_STOP=1", "-At", "-q"]
    for k, v in variables.items():
        cmd += ["-v", f"{k}={v}"]
    return subprocess.run(cmd, input=requete, text=True, capture_output=True, check=True).stdout.strip()


def noter(offres=0, ajoutes=0, rapproches=0, erreur=""):
    sql("insert into releves_offres (offres, ajoutes, rapproches, erreur) values (:o, :a, :r, nullif(:'e', ''));",
        o=offres, a=ajoutes, r=rapproches, e=erreur[:500])


def appeler(url, corps=None, entetes=None):
    requete = urllib.request.Request(url, data=corps, method="POST" if corps is not None else "GET",
                                     headers={"Accept": "application/json", **(entetes or {})})
    try:
        with urllib.request.urlopen(requete, timeout=60) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        return err.code, err.read().decode("utf-8", errors="replace")


def jeton():
    for portee in ("api_offresdemploiv2 o2dsoffre", "api_offresdemploiv2"):
        corps = urllib.parse.urlencode({
            "grant_type": "client_credentials", "client_id": os.environ["FT_CLIENT_ID"],
            "client_secret": os.environ["FT_CLIENT_SECRET"], "scope": portee,
        }).encode()
        code, texte = appeler(URL_JETON, corps, {"Content-Type": "application/x-www-form-urlencoded"})
        if code == 200:
            return json.loads(texte)["access_token"]
    raise SystemExit(f"Identifiants refusés par France Travail (code {code}).")


def categorie(o):
    naf = (o.get("codeNAF") or "").replace(".", "")
    rome = o.get("romeCode") or ""
    if naf.startswith("551"):
        return "hotel"
    if naf.startswith("55"):
        return "hebergement"
    if naf.startswith("5630"):
        return "bar"
    if naf.startswith("5610C"):
        return "restauration_rapide"
    if naf.startswith("56"):
        return "restaurant"
    return {"G1501": "hotel", "G1703": "hotel", "G1801": "bar"}.get(rome, "restaurant")


def commune(o):
    # « 974 - ST PAUL » ou « 974 - Saint-Paul » : sans le département.
    libelle = ((o.get("lieuTravail") or {}).get("libelle") or "").strip()
    libelle = re.sub(r"^\s*97\d\s*-\s*", "", libelle)
    libelle = re.sub(r"\bST\b", "SAINT", libelle, flags=re.I)
    libelle = re.sub(r"\bSTE\b", "SAINTE", libelle, flags=re.I)
    return libelle.title().replace(" ", "-") if libelle.isupper() else libelle


def ligne(o):
    e = o.get("entreprise") or {}
    nom = (e.get("nom") or "").strip()
    if not nom:  # offre anonyme : pas d'établissement à contacter
        return None
    lieu = o.get("lieuTravail") or {}
    contact = o.get("contact") or {}
    url = (o.get("origineOffre") or {}).get("urlOrigine") or \
        f"https://candidat.francetravail.fr/offres/recherche/detail/{o.get('id', '')}"
    return {
        "nom": nom,
        "categorie": categorie(o),
        "commune": commune(o),
        "lat": lieu.get("latitude"),
        "lng": lieu.get("longitude"),
        "email": contact.get("courriel"),
        "telephone": contact.get("telephone"),
        "site": e.get("url"),
        "intitule": (o.get("intitule") or "")[:200],
        "url": url,
        "publiee_le": o.get("dateActualisation") or o.get("dateCreation"),
    }


try:
    autorisation = {"Authorization": "Bearer " + jeton()}
    offres = {}
    for metier in METIERS:
        for page in range(PAGES_MAX):
            debut = page * PAR_PAGE
            parametres = urllib.parse.urlencode({
                "departement": "974", "codeROME": metier, "publieeDepuis": 31,
                "range": f"{debut}-{debut + PAR_PAGE - 1}",
            })
            code, texte = appeler(f"{URL_OFFRES}?{parametres}", entetes=autorisation)
            if code == 204 or not texte.strip():
                break
            if code not in (200, 206):
                raise RuntimeError(f"recherche {metier} : code {code}")
            resultats = json.loads(texte).get("resultats") or []
            for o in resultats:
                offres[o.get("id")] = o
            if code == 200 or len(resultats) < PAR_PAGE:
                break
            time.sleep(0.3)  # limite de débit de l'API
    lignes = [l for l in (ligne(o) for o in offres.values()) if l]
    resultat = sql("select ajoutes || ' ' || rapproches from importer_offres(:'l'::jsonb);", l=json.dumps(lignes))
    ajoutes, rapproches = (int(x) for x in resultat.split())
    noter(len(offres), ajoutes, rapproches)
    print(f"Offres France Travail : {len(offres)} offre(s), {len(lignes)} avec un établissement nommé, "
          f"{ajoutes} établissement(s) ajouté(s), {rapproches} déjà connu(s).")
except SystemExit as fin:
    noter(erreur=str(fin))
    raise
except Exception as err:
    noter(erreur=f"{type(err).__name__} : {err}")
    raise SystemExit(f"Relevé des offres interrompu : {err}")
PY
