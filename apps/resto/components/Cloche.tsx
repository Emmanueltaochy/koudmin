'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Bell, CircleCheck, FileSignature, Star, UserX, type LucideIcon } from 'lucide-react';
import { textesEcrans } from '@kivien/core';
import { luJusqua, marquerLu, notificationsDepuis, type Avis } from '@/lib/notifications';
import { useDonnees } from '@/lib/useDonnees';
import s from './Cloche.module.css';

const tn = textesEcrans.resto.notifications;

const ICONES: Record<Avis['type'], LucideIcon> = {
  accepte: CircleCheck,
  contrat: FileSignature,
  desiste: UserX,
  aNoter: Star,
};

const depuis = (le: number) => {
  const minutes = Math.max(0, Math.round((Date.now() - le) / 60000));
  if (minutes < 1) return tn.maintenant;
  if (minutes < 60) return tn.ilYa(`${minutes} min`);
  const heures = Math.round(minutes / 60);
  if (heures < 24) return tn.ilYa(`${heures} h`);
  return tn.ilYa(`${Math.round(heures / 24)} j`);
};

type Permission = 'indisponible' | 'default' | 'granted' | 'denied';
const permissionActuelle = (): Permission =>
  typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'indisponible';

/**
 * Cloche de l'espace pro : ce qui s'est passé sur les demandes de l'établissement affiché
 * (extra trouvé, contrat signé, désistement, mission à noter). Pastille = non lues.
 * Avec l'accord du navigateur, chaque nouvel avis s'affiche aussi sur l'ordinateur.
 */
export function Cloche({ position = 'bas' }: { position?: 'bas' | 'droite' }) {
  const router = useRouter();
  const { etat } = useDonnees(async (src) => {
    const [restaurant, demandes] = await Promise.all([src.restaurant(), src.demandes()]);
    return { restaurantId: restaurant.id, avis: notificationsDepuis(demandes) };
  });
  const [ouvert, setOuvert] = useState(false);
  const [lu, setLu] = useState(0);
  const [permission, setPermission] = useState<Permission>('indisponible');
  const connus = useRef<Set<string> | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  const panneau = useId();

  const donnees = etat.statut === 'pret' ? etat.donnees : null;

  useEffect(() => setPermission(permissionActuelle()), []);
  useEffect(() => {
    if (donnees) setLu(luJusqua(donnees.restaurantId));
  }, [donnees?.restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nouvel avis arrivé en temps réel : notification de l'ordinateur si l'onglet n'est pas regardé.
  useEffect(() => {
    if (!donnees) return;
    const ids = new Set(donnees.avis.map((a) => a.id));
    if (connus.current && permissionActuelle() === 'granted' && document.visibilityState !== 'visible') {
      for (const a of donnees.avis.filter((x) => !connus.current!.has(x.id))) {
        const n = new window.Notification(a.titre, { body: a.detail, icon: '/icon.svg', tag: a.id });
        n.onclick = () => {
          window.focus();
          router.push(a.lien);
          n.close();
        };
      }
    }
    connus.current = ids;
  }, [donnees, router]);

  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !zone.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener('mousedown', fermer);
    document.addEventListener('keydown', fermer);
    return () => {
      document.removeEventListener('mousedown', fermer);
      document.removeEventListener('keydown', fermer);
    };
  }, [ouvert]);

  const avis = donnees?.avis ?? [];
  const nonLues = avis.filter((a) => a.le > lu).length;

  const toutLire = () => {
    if (!donnees) return;
    const maintenant = Date.now();
    marquerLu(donnees.restaurantId, maintenant);
    setLu(maintenant);
  };

  const activerBureau = async () => {
    if (permissionActuelle() === 'indisponible') return;
    setPermission(await window.Notification.requestPermission());
  };

  return (
    <div className={s.zone} ref={zone}>
      <button
        type="button"
        className={s.bouton}
        aria-expanded={ouvert}
        aria-controls={panneau}
        aria-label={nonLues ? `${tn.ouvrir}, ${tn.nonLues(nonLues)}` : tn.ouvrir}
        onClick={() => setOuvert((o) => !o)}
      >
        <Bell size={22} strokeWidth={2} aria-hidden />
        {nonLues > 0 && (
          <span className={s.pastille} aria-hidden>
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>
      {ouvert && (
        <div id={panneau} className={s.panneau} data-position={position} role="dialog" aria-label={tn.titre}>
          <div className={s.tete}>
            <h2 className={s.titre}>{tn.titre}</h2>
            {nonLues > 0 && (
              <button type="button" className={s.lienDiscret} onClick={toutLire}>
                {tn.toutLu}
              </button>
            )}
          </div>
          {avis.length === 0 ? (
            <p className={s.vide}>{tn.aucune}</p>
          ) : (
            <ul className={s.liste}>
              {avis.map((a) => {
                const Icone = ICONES[a.type];
                return (
                  <li key={a.id}>
                    <Link
                      href={a.lien}
                      className={s.avis}
                      data-non-lu={a.le > lu ? 'true' : undefined}
                      data-type={a.type}
                      onClick={() => setOuvert(false)}
                    >
                      <span className={s.icone} aria-hidden>
                        <Icone size={18} strokeWidth={2} />
                      </span>
                      <span className={s.texte}>
                        <span className={s.titreAvis}>{a.titre}</span>
                        <span className={s.detail}>{a.detail}</span>
                        <span className={s.quand}>{depuis(a.le)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {permission === 'default' && (
            <button type="button" className={s.bureau} onClick={() => void activerBureau()}>
              <Bell size={16} strokeWidth={2} aria-hidden />
              {tn.bureau}
            </button>
          )}
          {permission === 'granted' && <p className={s.etatBureau}>{tn.bureauActif}</p>}
          {permission === 'denied' && <p className={s.etatBureau}>{tn.bureauRefuse}</p>}
        </div>
      )}
    </div>
  );
}
