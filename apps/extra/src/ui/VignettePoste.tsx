import { StyleSheet, View } from 'react-native';
import BedDouble from 'lucide-react-native/icons/bed-double';
import ChefHat from 'lucide-react-native/icons/chef-hat';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import ConciergeBell from 'lucide-react-native/icons/concierge-bell';
import CookingPot from 'lucide-react-native/icons/cooking-pot';
import Droplets from 'lucide-react-native/icons/droplets';
import FerrisWheel from 'lucide-react-native/icons/ferris-wheel';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import PartyPopper from 'lucide-react-native/icons/party-popper';
import Ship from 'lucide-react-native/icons/ship';
import Snowflake from 'lucide-react-native/icons/snowflake';
import Ticket from 'lucide-react-native/icons/ticket';
import Trees from 'lucide-react-native/icons/trees';
import Truck from 'lucide-react-native/icons/truck';
import UtensilsCrossed from 'lucide-react-native/icons/utensils-crossed';
import Wine from 'lucide-react-native/icons/wine';
import Wrench from 'lucide-react-native/icons/wrench';
import Briefcase from 'lucide-react-native/icons/briefcase';
import { FAMILLE_POSTE, type FamillePoste, type Poste } from '@kivien/core';
import { couleurs } from './theme';

const ICONE_POSTE: Record<Poste, typeof Wine> = {
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
  autre: Briefcase,
};

/** Fond teinté par famille (couleurs de la charte éclaircies), même code couleur que le site. */
const FOND: Record<FamillePoste, string> = {
  salle: '#FBE6BC',
  animation: '#FBE6BC',
  cuisine: '#D9E8DF',
  hebergement: '#D9E8DF',
  technique: '#ECEAE7',
  manutention: '#EFEDEA',
  terrain: '#EFEDEA',
};

/** Pastille colorée du métier : icône du poste sur la couleur de sa famille. */
export function VignettePoste({ poste, taille = 48 }: { poste: Poste; taille?: number }) {
  const Icone = ICONE_POSTE[poste];
  const famille = FAMILLE_POSTE[poste];
  const couleur = famille === 'cuisine' || famille === 'hebergement' ? couleurs.vacoa : couleurs.basalte;
  return (
    <View style={[styles.vignette, { width: taille, height: taille, backgroundColor: FOND[famille] }]} accessible={false}>
      <Icone size={Math.round(taille * 0.5)} color={couleur} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  vignette: { alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
});
