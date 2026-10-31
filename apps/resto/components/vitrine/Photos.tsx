import { PHOTOS_HAUT } from '@/lib/vitrine/liens';
import s from '@/app/(vitrine)/vitrine.module.css';

function ColonnePhotos({ photos, sens }: { photos: typeof PHOTOS_HAUT.monte; sens: 'monte' | 'descend' }) {
  // Deux fois la même série : le défilement boucle sans saut.
  return (
    <div className={`${s.colonne} ${sens === 'monte' ? s.monte : s.descend}`}>
      {[...photos, ...photos].map((p, i) => (
        <div key={i} className={s.photo} style={{ height: p.hauteur }}>
          <img src={p.src} alt={i < photos.length ? p.alt : ''} aria-hidden={i >= photos.length || undefined} loading={i < 2 ? 'eager' : 'lazy'} />
        </div>
      ))}
    </div>
  );
}

/** Deux colonnes de photos qui défilent en sens contraire (haut de page). */
export function PhotosDefilantes() {
  return (
    <div className={s.defilement}>
      <div className={s.masque}>
        <ColonnePhotos photos={PHOTOS_HAUT.monte} sens="monte" />
      </div>
      <div className={s.masque}>
        <ColonnePhotos photos={PHOTOS_HAUT.descend} sens="descend" />
      </div>
    </div>
  );
}
