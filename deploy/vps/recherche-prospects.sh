#!/usr/bin/env bash
# Recherche des établissements de l'île dans OpenStreetMap (restauration, bars, hébergements), puis
# des adresses e-mail sur leurs sites web, pour l'espace prospection de l'admin.
#
# Une recherche peut durer plusieurs minutes : elle tourne ici, jamais dans le navigateur.
#   --si-demande  (minuteur kivien-recherche-prospects.timer, chaque minute) : ne fait quelque chose
#                 que si un administrateur a cliqué « Chercher », ou si rien n'a été cherché depuis
#                 7 jours (rafraîchissement) ;
#   --bilan       affiche la dernière recherche (appelé à chaque déploiement : visible dans GitHub) ;
#   sans option   lance une recherche tout de suite.
#
# Données © les contributeurs d'OpenStreetMap, licence ODbL.
# Installé en /usr/local/sbin/kivien-recherche-prospects.
set -euo pipefail
MODE=${1:-maintenant}
case "$MODE" in --si-demande | --bilan | maintenant) ;; *) echo "Usage : $0 [--si-demande|--bilan]" >&2; exit 2 ;; esac
SOURCE=${KIVIEN_SOURCE:-/opt/kivien/source}

MODE="$MODE" COMMUNES="$SOURCE/packages/core/src/communes.ts" KIVIEN_PSQL=${KIVIEN_PSQL:-} KIVIEN_OVERPASS=${KIVIEN_OVERPASS:-} \
python3 -I - <<'PY'
import html, json, math, os, re, secrets, subprocess, sys, time, urllib.parse, urllib.request

MODE = os.environ["MODE"]
AGENT = "Kivien/1.0 (+https://kivien.re; bonjour@kivien.re)"
SERVEURS = os.environ.get("KIVIEN_OVERPASS", "").split() or [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
# Zone désignée de plusieurs façons : selon les données, la limite porte l'un ou l'autre code.
ZONE = '(area["ISO3166-1"="RE"];area["ISO3166-2"="FR-974"];area["ISO3166-2"="FR-RE"];)->.a;'
REQUETES = [
    "[out:json][timeout:170];" + ZONE + """(
  nwr["amenity"~"^(restaurant|bar|pub|biergarten|cafe|ice_cream|fast_food|food_court|nightclub)$"]["name"](area.a);
);out center tags;""",
    "[out:json][timeout:170];" + ZONE + """(
  nwr["tourism"~"^(hotel|resort|motel|guest_house|hostel|camp_site|chalet|apartment)$"]["name"](area.a);
);out center tags;""",
]
PAR_AMENITY = {"restaurant": "restaurant", "bar": "bar", "pub": "bar", "biergarten": "bar", "cafe": "cafe",
               "ice_cream": "cafe", "fast_food": "restauration_rapide", "food_court": "restauration_rapide",
               "nightclub": "nuit"}
PAR_TOURISM = {"hotel": "hotel", "resort": "hotel", "motel": "hotel", "guest_house": "hebergement",
               "hostel": "hebergement", "camp_site": "hebergement", "chalet": "hebergement", "apartment": "hebergement"}
SITES_PAR_PASSAGE = 150


def sql(requete, **variables):
    # KIVIEN_PSQL : autre accès à la base pour les essais (par défaut, le conteneur de Supabase).
    cmd = (os.environ.get("KIVIEN_PSQL") or "docker exec -i supabase-db psql -h localhost -U postgres -d postgres").split()
    cmd += ["-v", "ON_ERROR_STOP=1", "-At", "-q"]
    for k, v in variables.items():
        cmd += ["-v", f"{k}={v}"]
    return subprocess.run(cmd, input=requete, text=True, capture_output=True, check=True).stdout.strip()


def bilan():
    ligne = sql("""select concat_ws(' | ', statut, to_char(coalesce(fin_le, debut_le, demandee_le) at time zone 'Indian/Reunion', 'DD/MM HH24:MI'),
                         'trouvés ' || trouves, 'ajoutés ' || ajoutes, 'e-mails trouvés sur les sites ' || emails_trouves, erreur)
                   from recherches_prospects order by demandee_le desc limit 1;""")
    fiches = sql("select count(*) || ' établissements, ' || count(email) || ' avec e-mail' from prospects;")
    print(f"Prospection : {fiches}. Dernière recherche : {ligne or 'aucune'}.")


if MODE == "--bilan":
    bilan()
    raise SystemExit(0)

# Une recherche interrompue (redémarrage) depuis 30 min est notée en échec.
sql("""update recherches_prospects set statut = 'echouee', fin_le = now(), erreur = 'Interrompue avant la fin'
       where statut = 'en_cours' and debut_le < now() - interval '30 minutes';""")
if MODE == "--si-demande":
    rid = sql("select id from recherches_prospects where statut = 'demandee' order by demandee_le limit 1;")
    if not rid and not sql("select 1 from recherches_prospects where demandee_le > now() - interval '7 days' limit 1;"):
        rid = sql("insert into recherches_prospects default values returning id;")
    if not rid:
        raise SystemExit(0)
else:
    rid = sql("insert into recherches_prospects default values returning id;")
sql("update recherches_prospects set statut = 'en_cours', debut_le = now() where id = :'id';", id=rid)

# Communes (centre) : pour les lieux sans « addr:city », la plus proche.
COMMUNES = []
try:
    for nom, lat, lng in re.findall(r"nom: ['\"](.+?)['\"], lat: (-?[\d.]+), lng: (-?[\d.]+)", open(os.environ["COMMUNES"], encoding="utf-8").read()):
        COMMUNES.append((nom, float(lat), float(lng)))
except OSError:
    pass


def commune_proche(lat, lng):
    if lat is None or not COMMUNES:
        return None
    return min(COMMUNES, key=lambda c: (c[1] - lat) ** 2 + ((c[2] - lng) * math.cos(math.radians(lat))) ** 2)[0]


def premier(t, *cles):
    for c in cles:
        v = (t.get(c) or "").split(";")[0].strip()
        if v:
            return v
    return None


def fiche(e):
    t = e.get("tags") or {}
    nom = (t.get("name") or "").strip()
    if not nom:
        return None
    lat = e.get("lat", (e.get("center") or {}).get("lat"))
    lng = e.get("lon", (e.get("center") or {}).get("lon"))
    rue = " ".join(x for x in (t.get("addr:housenumber"), t.get("addr:street")) if x)
    courriel = premier(t, "email", "contact:email")
    return {
        "osm_id": f"{e['type']}/{e['id']}",
        "nom": nom,
        "categorie": PAR_AMENITY.get(t.get("amenity", "")) or PAR_TOURISM.get(t.get("tourism", "")) or "autre",
        "commune": premier(t, "addr:city", "addr:municipality") or commune_proche(lat, lng),
        "adresse": rue or premier(t, "addr:full"),
        "lat": lat, "lng": lng,
        "telephone": premier(t, "phone", "contact:phone", "contact:mobile", "mobile"),
        "email": courriel.lower() if courriel else None,
        "site": premier(t, "website", "contact:website", "url"),
    }


def overpass(requete):
    echecs = []
    for serveur in SERVEURS:
        try:
            demande = urllib.request.Request(serveur, data=urllib.parse.urlencode({"data": requete}).encode(),
                                             headers={"User-Agent": AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(demande, timeout=200) as r:
                reponse = json.load(r)
            if reponse.get("remark") and not reponse.get("elements"):
                raise RuntimeError(reponse["remark"][:120])
            return reponse.get("elements") or []
        except Exception as x:  # noqa: BLE001 — chaque échec est noté, le serveur suivant est essayé
            echecs.append(f"{urllib.parse.urlparse(serveur).hostname} : {str(x)[:120]}")
            time.sleep(5)
    raise RuntimeError(" ; ".join(echecs))


# --- E-mails sur les sites des établissements -------------------------------------------------
COURRIEL = re.compile(r"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}", re.I)
FAUX = re.compile(r"\.(png|jpe?g|gif|svg|webp)$|example\.|sentry|wixpress|noreply|no-reply|domain\.|votre|email@|nom@", re.I)


def lire_page(url):
    demande = urllib.request.Request(url, headers={"User-Agent": AGENT, "Accept": "text/html"})
    with urllib.request.urlopen(demande, timeout=5) as r:
        if "html" not in (r.headers.get("Content-Type") or "html"):
            return ""
        return r.read(600_000).decode(r.headers.get_content_charset() or "utf-8", "replace")


def courriel_du_site(site):
    if not re.match(r"^https?://", site):
        site = "https://" + site
    hote = re.sub(r"^www\.", "", urllib.parse.urlparse(site).hostname or "")
    if re.search(r"(facebook|instagram|tripadvisor|booking|airbnb|google)\.", hote):
        return None
    base = site.rstrip("/")
    for chemin in ("", "/contact", "/nous-contacter"):
        try:
            texte = html.unescape(lire_page(base + chemin))
        except Exception:  # noqa: BLE001 — site injoignable : page suivante
            continue
        texte = re.sub(r"\s*[\[(]\s*(at|arobase)\s*[\])]\s*|\s+arobase\s+", "@", texte, flags=re.I)
        trouves = [c.lower().rstrip(".") for c in COURRIEL.findall(texte) if not FAUX.search(c)]
        if trouves:
            # De préférence une adresse du domaine du site.
            return next((c for c in trouves if hote and c.endswith("@" + hote)), trouves[0])
    return None


try:
    elements = []
    for requete in REQUETES:
        elements += overpass(requete)
    fiches, vus = [], set()
    for e in elements:
        f = fiche(e)
        if f and f["osm_id"] not in vus:
            vus.add(f["osm_id"])
            fiches.append(f)
    donnees = json.dumps(fiches, ensure_ascii=False)
    balise = "$imp" + secrets.token_hex(6) + "$"
    ajoutes, majs = sql(f"select ajoutes || '|' || mis_a_jour from importer_prospects({balise}{donnees}{balise}::jsonb);").split("|")

    trouves = 0
    a_lire = sql(f"""select coalesce(json_agg(x), '[]') from (select id, site from prospects
                    where email is null and site is not null and site_lu_le is null
                    order by importe_le limit {SITES_PAR_PASSAGE}) x;""")
    for p in json.loads(a_lire):
        courriel = courriel_du_site(p["site"])
        if courriel and re.fullmatch(r"[^@\s]+@[^@\s]+\.[a-z]{2,}", courriel):
            sql("""update prospects set email = :'email', source_email = 'site', site_lu_le = now(), maj_le = now()
                   where id = :'id' and email is null;""", id=p["id"], email=courriel)
            trouves += 1
        else:
            sql("update prospects set site_lu_le = now() where id = :'id';", id=p["id"])

    sql("""update recherches_prospects set statut = 'terminee', fin_le = now(), trouves = :n, ajoutes = :a,
             mis_a_jour = :m, emails_trouves = :e, erreur = null where id = :'id';""",
        id=rid, n=len(fiches), a=ajoutes, m=majs, e=trouves)
except Exception as x:  # noqa: BLE001 — le message exact est montré dans l'espace admin
    message = str(x)
    if isinstance(x, subprocess.CalledProcessError):
        message = (x.stderr or "")[-400:]
    sql("update recherches_prospects set statut = 'echouee', fin_le = now(), erreur = :'erreur' where id = :'id';",
        id=rid, erreur=message[:500] or type(x).__name__)
bilan()
PY
