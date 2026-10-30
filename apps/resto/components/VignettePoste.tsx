import {
  BedDouble,
  ChefHat,
  ClipboardList,
  ConciergeBell,
  CookingPot,
  Droplets,
  FerrisWheel,
  GraduationCap,
  Lightbulb,
  PartyPopper,
  Ship,
  Snowflake,
  Ticket,
  Trees,
  Truck,
  UtensilsCrossed,
  Wine,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { FAMILLE_POSTE, type Poste } from '@kivien/core';
import s from './VignettePoste.module.css';

export const ICONE_POSTE: Record<Poste, LucideIcon> = {
  serveur: UtensilsCrossed,
  barman: Wine,
  cuisine: ChefHat,
  commis: CookingPot,
  plonge: Droplets,
  reception: ConciergeBell,
  etages: BedDouble,
  animation: PartyPopper,
  technique_spectacle: Lightbulb,
  montage_spectacle: Wrench,
  accueil_spectacle: Ticket,
  demenagement: Truck,
  enquete: ClipboardList,
  fete_foraine: FerrisWheel,
  entrepot_viande: Snowflake,
  reparation_navale: Ship,
  travaux_forestiers: Trees,
  formation: GraduationCap,
};

/** Pastille colorée du métier (couleur de sa famille, icône du poste). */
export function VignettePoste({ poste, taille = 48 }: { poste: Poste; taille?: number }) {
  const Icone = ICONE_POSTE[poste];
  return (
    <span className={s.vignette} data-famille={FAMILLE_POSTE[poste]} style={{ width: taille, height: taille }} aria-hidden>
      <Icone size={Math.round(taille * 0.5)} strokeWidth={2} />
    </span>
  );
}
