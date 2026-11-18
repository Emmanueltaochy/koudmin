#!/usr/bin/env bash
# DPAE automatique : déclare à l'Urssaf les embauches des établissements qui ont donné mandat à
# Kivien (migration 20261118090000). Le minuteur kivien-dpae.timer l'appelle toutes les 5 minutes.
#
# Protocole : « API DPAE » de l'Urssaf (guide d'implémentation, compatible avec l'API DSN) :
#   1. authentification  POST https://mon.urssaf.fr/authentifier_dpae      -> jeton
#   2. dépôt             POST https://depot.dpae-edi.urssaf.fr/deposer-dsn/1.0/   (XML, gzip)
#   3. retours           GET  https://consultation.dpae-edi.urssaf.fr/lister-retours-flux/...
# Le compte utilisé est le compte Urssaf en ligne de Kivien (SIRET, nom, prénom, mot de passe),
# rangé dans /opt/kivien/supabase/.env par deploy/vps/configurer-dpae.sh. Jamais dans le dépôt.
#
# Installé en /usr/local/sbin/kivien-dpae. Usage manuel : sudo kivien-dpae
# Essais : KIVIEN_PSQL (autre accès à la base) et KIVIEN_DPAE_URL (faux service Urssaf local),
# voir scripts/verifier-dpae.sh.
set -euo pipefail
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}
lire() { grep -E "^$1=" "$ICI/.env" 2>/dev/null | tail -n1 | cut -d= -f2-; }

if [ -z "$(lire DPAE_MOT_DE_PASSE || true)" ]; then
  echo "Compte Urssaf non configuré (deploy/vps/configurer-dpae.sh) : rien à faire."
  exit 0
fi

DPAE_SIRET=$(lire DPAE_SIRET || true) DPAE_NOM=$(lire DPAE_NOM || true) DPAE_PRENOM=$(lire DPAE_PRENOM || true) \
DPAE_MOT_DE_PASSE=$(lire DPAE_MOT_DE_PASSE || true) DPAE_SERVICE=$(lire DPAE_SERVICE || true) \
DPAE_ESSAI=$(lire DPAE_ESSAI || true) DPAE_CODE_URSSAF=$(lire DPAE_CODE_URSSAF || true) \
KIVIEN_PSQL=${KIVIEN_PSQL:-} KIVIEN_DPAE_URL=${KIVIEN_DPAE_URL:-} \
python3 -I - <<'PY'
import datetime, gzip, json, os, re, subprocess, unicodedata, urllib.error, urllib.request
from xml.sax.saxutils import escape

PAR_PASSAGE = 20
faux = os.environ.get("KIVIEN_DPAE_URL")  # essais : un seul faux service pour les trois adresses
URL_AUTH = f"{faux}/authentifier_dpae" if faux else "https://mon.urssaf.fr/authentifier_dpae"
URL_DEPOT = (faux or "https://depot.dpae-edi.urssaf.fr") + "/deposer-dsn/1.0/"
URL_RETOURS = (faux or "https://consultation.dpae-edi.urssaf.fr") + "/lister-retours-flux/"
# Service DPAE dans l'authentification, et code de l'Urssaf destinataire (974 : La Réunion).
SERVICE = os.environ.get("DPAE_SERVICE") or "98"
CODE_URSSAF = os.environ.get("DPAE_CODE_URSSAF") or "974"
# Mode d'essai de l'Urssaf : le fichier est contrôlé mais aucune embauche n'est enregistrée.
ESSAI = (os.environ.get("DPAE_ESSAI") or "").lower() in ("1", "oui", "true")
INDICATEUR = "1" if ESSAI else "120"


def sql(requete, **variables):
    """Requête dans la base (variables passées à psql, jamais collées dans le SQL)."""
    cmd = (os.environ.get("KIVIEN_PSQL") or "docker exec -i supabase-db psql -h localhost -U postgres -d postgres").split()
    cmd += ["-v", "ON_ERROR_STOP=1", "-At", "-q"]
    for k, v in variables.items():
        cmd += ["-v", f"{k}={v}"]
    return subprocess.run(cmd, input=requete, text=True, capture_output=True, check=True).stdout.strip()


def noter(affectation, resultat, id_flux="", reference="", accuse="", motif=""):
    sql("select noter_dpae(:'a'::uuid, :'r', nullif(:'f', ''), nullif(:'ref', ''), nullif(:'acc', ''), nullif(:'m', ''));",
        a=affectation, r=resultat, f=id_flux, ref=reference[:60], acc=accuse[:8000], m=motif[:500])


def majuscules(texte, autorises, longueur=32):
    """Comme l'exige l'Urssaf : majuscules sans accent, caractères autorisés seulement."""
    t = unicodedata.normalize("NFD", texte or "")
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").upper().replace("’", "'")
    t = re.sub(f"[^{autorises}]", " ", t)
    return re.sub(r"\s+", " ", t).strip()[:longueur]


def simple(texte, longueur=32):
    """Raison sociale, adresse, commune : lettres accentuées admises, 32 caractères au plus."""
    t = re.sub(r"[^a-zA-Z0-9éèêëâàäöôûüùîïç°²!#$%&'()*+,\-./:;<=>?@ ]", " ", (texte or "").replace("’", "'"))
    return re.sub(r"\s+", " ", t).strip()[:longueur]


def departement_naissance(nir):
    """Département de naissance, lu dans le numéro de sécurité sociale (971 à 976 pour l'outre-mer,
    99 pour une naissance à l'étranger)."""
    d = nir[5:7]
    return nir[5:8] if d in ("97", "98") else d


def fichier(d):
    """Fichier XML d'une DPAE (dessin d'enregistrement de l'Urssaf, encodage ISO-8859-1)."""
    nir = d["nir"].upper()
    debut = datetime.date.fromisoformat(d["jour"])
    fin = debut + datetime.timedelta(days=1 if d["fin"] <= d["debut"] else 0)
    telephone = re.sub(r"^\+262", "0", d.get("telephone") or "")
    contact = ""
    if re.fullmatch(r"[0-9]{10}", telephone):
        contact = f"""
        <FR_EmployerContact>
          <FR_PhoneNumber>
            <rxphadr:FR_PhoneAddress.PhoneNumber.Text>{telephone}</rxphadr:FR_PhoneAddress.PhoneNumber.Text>
          </FR_PhoneNumber>
        </FR_EmployerContact>"""
    e = lambda v: escape(str(v))
    xml = f"""<?xml version="1.0" encoding="ISO-8859-1" ?>
<FR_DUE_Upload xmlns:cct="urn:oasis:names:tc:ubl:corecomponentTypes:1.0:0.70"
 xmlns:rxdt="http://www.repxml.org/DataTypes"
 xmlns:rxorg="http://www.repxml.org/Organization"
 xmlns:rxpadr="http://www.repxml.org/PostalAddress"
 xmlns:rxpers="http://www.repxml.org/Person_Identity"
 xmlns:rxphadr="http://www.repxml.org/PhoneAddress"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FR_DUE_Upload.Test.Indicator>{INDICATEUR}</FR_DUE_Upload.Test.Indicator>
  <FR_DuesGroup>
    <FR_Employer>
      <FR_EmployerIdentity>
        <rxorg:FR_Organization.SIRET.Identifier>{e(d["siret"])}</rxorg:FR_Organization.SIRET.Identifier>
        <rxorg:FR_Organization.Designation.Text>{e(simple(d["raison_sociale"]))}</rxorg:FR_Organization.Designation.Text>
        <rxorg:FR_Organization.APE.Code>{e(d["code_ape"])}</rxorg:FR_Organization.APE.Code>
      </FR_EmployerIdentity>
      <FR_Employer.URSSAF.Code>{e(CODE_URSSAF)}</FR_Employer.URSSAF.Code>
      <FR_EmployerAddress>
        <rxpadr:FR_PostalAddress.StreetDesignation.Text>{e(simple(d["adresse"]))}</rxpadr:FR_PostalAddress.StreetDesignation.Text>
        <rxpadr:FR_PostalAddress.Town.Text>{e(simple(d["commune"]))}</rxpadr:FR_PostalAddress.Town.Text>
        <rxpadr:FR_PostalAddress.Postal.Code>{e(d["code_postal"])}</rxpadr:FR_PostalAddress.Postal.Code>
      </FR_EmployerAddress>{contact}
    </FR_Employer>
    <FR_EmployeeGroup>
      <FR_Employee>
        <FR_EmployeeIdentity>
          <rxpers:FR_PersonIdentity.Surname.Text>{e(majuscules(d["nom"], "A-Z' .&-"))}</rxpers:FR_PersonIdentity.Surname.Text>
          <rxpers:FR_PersonIdentity.ChristianName.Text>{e(majuscules(d["prenom"], "A-Z' .&-"))}</rxpers:FR_PersonIdentity.ChristianName.Text>
          <rxpers:FR_PersonIdentity.Sex.Code>{nir[0]}</rxpers:FR_PersonIdentity.Sex.Code>
          <rxpers:FR_NNI>
            <rxpers:FR_NNI.NIR.Identifier>{nir[:13]}</rxpers:FR_NNI.NIR.Identifier>
            <rxpers:FR_NNI.NIRKey.Text>{nir[13:15]}</rxpers:FR_NNI.NIRKey.Text>
          </rxpers:FR_NNI>
          <rxpers:FR_Birth>
            <rxpers:FR_Birth.Date>{e(d["date_naissance"])}</rxpers:FR_Birth.Date>
            <rxpers:FR_Birth.Town.Text>{e(majuscules(d["lieu_naissance"], "A-Z0-9 .'-"))}</rxpers:FR_Birth.Town.Text>
          </rxpers:FR_Birth>
        </FR_EmployeeIdentity>
        <FR_EmployeeComplement>
          <FR_EmployeeComplement.Birth_Department.Code>{departement_naissance(nir)}</FR_EmployeeComplement.Birth_Department.Code>
        </FR_EmployeeComplement>
      </FR_Employee>
      <FR_Contract>
        <FR_Contract.StartContract.Date>{debut.isoformat()}</FR_Contract.StartContract.Date>
        <FR_Contract.StartContract.Time>{d["debut"] // 60:02d}:{d["debut"] % 60:02d}:00</FR_Contract.StartContract.Time>
        <FR_Contract.EndContract.Date>{fin.isoformat()}</FR_Contract.EndContract.Date>
        <FR_Contract.Nature.Code>CDD</FR_Contract.Nature.Code>
        <FR_Contract.HealthService.Text>{e(d["service_sante"])}</FR_Contract.HealthService.Text>
      </FR_Contract>
    </FR_EmployeeGroup>
  </FR_DuesGroup>
</FR_DUE_Upload>
"""
    return xml.encode("iso-8859-1", errors="replace")


def appeler(url, corps=None, entetes=None):
    """Renvoie (code HTTP, texte de la réponse). Les refus de l'Urssaf (4xx) ne lèvent pas."""
    requete = urllib.request.Request(url, data=corps, method="POST" if corps is not None else "GET",
                                     headers={"User-Agent": "Kivien-DPAE", "Accept-Encoding": "gzip", **(entetes or {})})
    try:
        with urllib.request.urlopen(requete, timeout=60) as r:
            code, brut, encodage = r.status, r.read(), r.headers.get("Content-Encoding")
    except urllib.error.HTTPError as err:
        code, brut, encodage = err.code, err.read(), err.headers.get("Content-Encoding")
    if encodage == "gzip" or brut[:2] == b"\x1f\x8b":
        brut = gzip.decompress(brut)
    try:
        return code, brut.decode("utf-8")
    except UnicodeDecodeError:
        return code, brut.decode("iso-8859-1")


def lisible(texte, longueur=400):
    """Message de l'Urssaf sans balises, pour l'afficher à l'établissement."""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", texte or "")).strip()[:longueur]


def authentifier():
    e = lambda cle: escape(os.environ.get(cle) or "")
    corps = (f"<identifiants><siret>{e('DPAE_SIRET')}</siret><nom>{e('DPAE_NOM')}</nom>"
             f"<prenom>{e('DPAE_PRENOM')}</prenom><motdepasse>{e('DPAE_MOT_DE_PASSE')}</motdepasse>"
             f"<service>{escape(SERVICE)}</service></identifiants>")
    code, texte = appeler(URL_AUTH, corps.encode("utf-8"), {"Content-Type": "application/xml"})
    if code != 200 or not texte.strip():
        raise SystemExit(f"Authentification refusée par l'Urssaf (code {code}) : {lisible(texte, 200)}")
    return texte.strip()


def retours(id_flux):
    """Retours d'un dépôt : liste de {nature, statut, url}. Le service répond en JSON ou en XML."""
    code, texte = appeler(URL_RETOURS + "2.0/" + id_flux, entetes={**AUTORISATION, "Accept": "application/json"})
    if code == 404:
        code, texte = appeler(URL_RETOURS + "1.0/" + id_flux, entetes=AUTORISATION)
    if code != 200:
        raise RuntimeError(f"consultation des retours : code {code}")
    if texte.lstrip().startswith("{"):
        flux = (json.loads(texte).get("retours") or {}).get("flux") or []
        flux = flux if isinstance(flux, list) else [flux]
        liste = []
        for f in flux:
            r = f.get("retour") or []
            liste += r if isinstance(r, list) else [r]
        return [{"nature": str(r.get("nature")), "statut": r.get("statut"), "url": r.get("url")} for r in liste]
    liste = []
    for bloc in re.findall(r"<retour>(.*?)</retour>", texte, flags=re.S):
        champ = lambda nom: (re.search(rf"<{nom}>\s*(.*?)\s*</{nom}>", bloc, flags=re.S) or [None, None])[1]
        liste.append({"nature": champ("nature"), "statut": champ("statut"), "url": champ("url")})
    return liste


def telecharger(url):
    if not url:
        return ""
    if faux:  # essais : les liens du faux service pointent déjà vers lui
        url = re.sub(r"^https?://[^/]+", faux, url)
    code, texte = appeler(re.sub(r"\s+", "", url), entetes=AUTORISATION)
    return texte if code == 200 else ""


lot = json.loads(sql("select coalesce(json_agg(x), '[]') from prendre_dpae(:n) x;", n=PAR_PASSAGE))
attente = json.loads(sql("select coalesce(json_agg(x), '[]') from dpae_envoyees() x;"))
if not lot and not attente:
    print("Aucune DPAE à envoyer ni à suivre.")
    raise SystemExit(0)

AUTORISATION = {"Authorization": "DSNLogin jeton=" + authentifier()}
deposees = acceptees = refusees = echecs = 0

for d in lot:
    try:
        code, texte = appeler(URL_DEPOT, gzip.compress(fichier(d)),
                              {**AUTORISATION, "Content-Type": "text/plain", "Content-Encoding": "gzip"})
    except Exception as err:  # réseau : la DPAE reste à envoyer
        noter(d["affectation_id"], "echec", motif=f"Service de l'Urssaf injoignable ({type(err).__name__}).")
        echecs += 1
        continue
    flux = re.search(r"<[^<>/]*id[a-z_]*flux[^<>]*>\s*([^<\s]+)\s*<", texte, flags=re.I)
    if code == 200 and flux:
        noter(d["affectation_id"], "envoyee", id_flux=flux.group(1))
        attente.append({"affectation_id": d["affectation_id"], "id_flux": flux.group(1)})
        deposees += 1
    elif code == 422:
        noter(d["affectation_id"], "refusee", id_flux=flux.group(1) if flux else "", accuse=texte,
              motif="Fichier rejeté par l'Urssaf : " + lisible(texte))
        refusees += 1
    else:
        noter(d["affectation_id"], "echec", motif=f"Réponse inattendue de l'Urssaf (code {code}) : {lisible(texte, 200)}")
        echecs += 1

for a in attente:
    try:
        liste = retours(a["id_flux"])
    except Exception as err:
        print(f"Retours du dépôt {a['id_flux']} : {err}")
        continue
    rejet = next((r for r in liste if r["statut"] == "KO"), None)
    # L'accusé de réception (nature 20) n'existe qu'en réel ; en essai, le certificat de conformité (11) suffit.
    accord = next((r for r in liste if r["nature"] == ("11" if ESSAI else "20") and r["statut"] in ("OK", "ANO")), None)
    if rejet:
        document = telecharger(rejet["url"])
        noter(a["affectation_id"], "refusee", accuse=document,
              motif="DPAE rejetée par l'Urssaf : " + (lisible(document) or f"retour {rejet['nature']}"))
        refusees += 1
    elif accord:
        document = telecharger(accord["url"])
        dossier = re.search(r"<[^<>/]*dossier[^<>]*>\s*([^<\s][^<]*?)\s*<", document, flags=re.I)
        noter(a["affectation_id"], "acceptee", reference=dossier.group(1) if dossier else a["id_flux"],
              accuse=document or "Essai : fichier conforme, aucune embauche enregistrée.")
        acceptees += 1

print(f"DPAE : {deposees} déposée(s), {acceptees} acceptée(s), {refusees} refusée(s), {echecs} échec(s).")
PY
