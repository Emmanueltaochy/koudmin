#!/usr/bin/env bash
# Établissements qui vont recruter : API « La Bonne Boite v2 » de France Travail (francetravail.io),
# entreprises de La Réunion (974) à fort potentiel d'embauche dans les 6 prochains mois, pour les
# métiers de l'hôtellerie et de la restauration. Chaque établissement est rapproché d'un prospect
# existant (même nom, même commune) ou ajouté à la prospection (migration 20261121090000) ; ceux à
# fort potentiel sont marqués et passent en premier. Le minuteur kivien-offres.timer l'appelle chaque
# jour à 6 h 40 (La Réunion). Données mises à jour une fois par mois par France Travail.
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
URL_RECHERCHE = (faux or "https://api.francetravail.io") + "/partenaire/labonneboite/v2/search/"
# Portée de l'API (documentation francetravail.io, La Bonne Boite v2).
PORTEES = ("api_labonneboitev2", "api_labonneboitev2 search office")
# Métiers (codes ROME) : cuisine, restauration polyvalente, plonge, bar, service en salle,
# entretien des chambres, réception d'hôtel.
METIERS = {"G1602": "cuisine", "G1603": "restauration", "G1605": "plonge", "G1801": "bar",
           "G1803": "service en salle", "G1501": "entretien des chambres", "G1703": "réception"}
PAR_PAGE = 100
PAGES_MAX = 15
PAUSE = float(os.environ.get("KIVIEN_FT_PAUSE") or 0.6)  # quelques appels par seconde au plus


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
    code = None
    for portee in PORTEES:
        corps = urllib.parse.urlencode({
            "grant_type": "client_credentials", "client_id": os.environ["FT_CLIENT_ID"],
            "client_secret": os.environ["FT_CLIENT_SECRET"], "scope": portee,
        }).encode()
        code, texte = appeler(URL_JETON, corps, {"Content-Type": "application/x-www-form-urlencoded"})
        if code == 200:
            return json.loads(texte)["access_token"]
    raise SystemExit(f"Identifiants refusés par France Travail (code {code}). L'API La Bonne Boite v2 est-elle ajoutée à l'application ?")


def categorie(e):
    naf = (e.get("naf") or "").replace(".", "")
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
    return {"G1501": "hotel", "G1703": "hotel", "G1801": "bar"}.get(e.get("rome"), "restaurant")


def joli(texte):
    """« LE BOUCAN GRILLE » devient « Le Boucan Grille » ; un nom déjà en casse mixte ne change pas."""
    texte = (texte or "").strip()
    return texte.title() if texte.isupper() else texte


def ligne(e, metiers):
    nom = joli(e.get("office_name")) or joli(e.get("company_name"))
    if not nom:
        return None
    lieu = e.get("location") or {}
    fort = bool(e.get("is_high_potential"))
    libelles = ", ".join(sorted({METIERS[m] for m in metiers if m in METIERS}))
    return {
        "nom": nom,
        "categorie": categorie(e),
        "commune": (e.get("city") or "").strip(),
        "lat": lieu.get("lat"),
        "lng": lieu.get("lon"),
        # Seules les entreprises à fort potentiel sont marquées « recrute » (date du relevé).
        "publiee_le": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) if fort else None,
        "intitule": f"Fort potentiel d'embauche ({libelles})" if fort and libelles else None,
        "url": None,
    }


try:
    autorisation = {"Authorization": "Bearer " + jeton()}
    entreprises = {}
    metiers = {}
    for page in range(1, PAGES_MAX + 1):
        parametres = urllib.parse.urlencode(
            [("rome", m) for m in METIERS] + [("department_number", "974"), ("page", page),
                                              ("page_size", PAR_PAGE), ("sort_by", "hiring_score")])
        code, texte = appeler(f"{URL_RECHERCHE}?{parametres}", entetes=autorisation)
        if code == 429:  # trop d'appels : on attend puis on reprend la même page une fois
            time.sleep(2)
            code, texte = appeler(f"{URL_RECHERCHE}?{parametres}", entetes=autorisation)
        if code == 204 or not texte.strip():
            break
        if code != 200:
            raise RuntimeError(f"recherche page {page} : code {code}")
        items = json.loads(texte).get("items") or []
        for e in items:
            cle = e.get("siret") or str(e.get("id"))
            garde = entreprises.get(cle)
            # Une même entreprise revient pour plusieurs métiers : on garde la fiche la plus favorable.
            if not garde or (e.get("is_high_potential") and not garde.get("is_high_potential")):
                entreprises[cle] = e
            metiers.setdefault(cle, set()).add(e.get("rome"))
        if len(items) < PAR_PAGE:
            break
        time.sleep(PAUSE)
    lignes = [l for l in (ligne(e, metiers[k]) for k, e in entreprises.items()) if l]
    resultat = sql("select ajoutes || ' ' || rapproches from importer_offres(:'l'::jsonb);", l=json.dumps(lignes))
    ajoutes, rapproches = (int(x) for x in resultat.split())
    forts = sum(1 for l in lignes if l["publiee_le"])
    noter(len(entreprises), ajoutes, rapproches)
    print(f"La Bonne Boite : {len(entreprises)} établissement(s) de La Réunion, dont {forts} à fort potentiel "
          f"d'embauche ; {ajoutes} ajouté(s) à la prospection, {rapproches} déjà connu(s).")
except SystemExit as fin:
    noter(erreur=str(fin))
    raise
except Exception as err:
    noter(erreur=f"{type(err).__name__} : {err}")
    raise SystemExit(f"Relevé La Bonne Boite interrompu : {err}")
PY
