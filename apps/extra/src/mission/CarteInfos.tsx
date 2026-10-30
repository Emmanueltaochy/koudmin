import type { ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import Briefcase from 'lucide-react-native/icons/briefcase';
import Bus from 'lucide-react-native/icons/bus';
import Check from 'lucide-react-native/icons/check';
import Euro from 'lucide-react-native/icons/euro';
import MapPin from 'lucide-react-native/icons/map-pin';
import Phone from 'lucide-react-native/icons/phone';
import Shirt from 'lucide-react-native/icons/shirt';
import {
  detailCalculExtra,
  dureeMinutes,
  formatDistance,
  formatEuros,
  formatNet,
  legendeAcces,
  ligneRetour,
  salaireMission,
  textes as t,
  type MissionResume,
} from '@kivien/core';
import type { LieuMission } from '../donnees';
import { BoutonSecondaire, Lien } from '../ui/Bouton';
import { couleurs, rayons } from '../ui/theme';
import { Texte } from '../ui/Texte';

const td = t.extra.detail;

function Ligne({ icone, children, derniere }: { icone: ReactNode; children: ReactNode; derniere?: boolean }) {
  return (
    <View style={[styles.ligne, !derniere && styles.separee]}>
      <View style={styles.icone}>{icone}</View>
      <View style={styles.contenu}>{children}</View>
    </View>
  );
}

/** Ouvre l'itinéraire Google Maps vers l'établissement (l'app si elle est installée, sinon le navigateur). */
function ouvrirItineraire({ lat, lng }: { lat: number; lng: number }) {
  void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
}

/** Carte blanche du détail : salaire, lieu, retour, tenue. */
export function CarteInfos({
  mission: m,
  lieu,
  position,
  tenue,
  descriptionPoste = null,
}: {
  mission: MissionResume;
  lieu: LieuMission | null;
  position: { lat: number; lng: number } | null;
  tenue: string | null;
  descriptionPoste?: string | null;
}) {
  const minutes = dureeMinutes(m.debut, m.fin) ?? 0;
  const salaire = salaireMission(minutes, m.tauxHoraireBrutCentimes);
  // Sur le détail, la ligne retour s'affiche à tous les profils (information utile avec ou sans voiture).
  const retour = ligneRetour(m, { aVoiture: false });
  const distance = formatDistance(m.distanceMetres);
  const aTenue = !!tenue;

  return (
    <View style={styles.carte}>
      <Ligne icone={<Euro size={20} color={couleurs.galet} strokeWidth={2} />}>
        <Texte variante="corpsFort">{formatNet(salaire.netEuros)}</Texte>
        <Texte variante="legende" couleur="galet">
          {formatEuros(salaire.brutCentimes)} {td.brutDetail}
        </Texte>
        <Texte variante="legende" couleur="galet">
          {detailCalculExtra(minutes, m.tauxHoraireBrutCentimes)}
        </Texte>
      </Ligne>

      {descriptionPoste ? (
        <Ligne icone={<Briefcase size={20} color={couleurs.galet} strokeWidth={2} />}>
          <Texte>{descriptionPoste}</Texte>
        </Ligne>
      ) : null}

      <Ligne
        icone={<MapPin size={20} color={couleurs.galet} strokeWidth={2} />}
        derniere={retour.type === 'aucune' && !aTenue}
      >
        {lieu ? (
          <View style={styles.lieu}>
            <View>
              <Texte variante="corpsFort">{lieu.adresse}</Texte>
              <Texte variante="corpsFort">
                {[lieu.codePostal, m.commune].filter(Boolean).join(' ')}
              </Texte>
              <Texte variante="legende" couleur="galet">
                {legendeAcces(distance, lieu.acces)}
              </Texte>
            </View>
            <View style={styles.actionsLieu}>
              <Lien
                libelle={td.itineraire}
                onPress={() => ouvrirItineraire(lieu)}
                icone={<ArrowUpRight size={16} color={couleurs.pimentFonce} strokeWidth={2} />}
              />
              {lieu.telephone && (
                <BoutonSecondaire
                  libelle={td.appeler}
                  icone={<Phone size={18} color={couleurs.basalte} strokeWidth={2} />}
                  onPress={() => void Linking.openURL(`tel:${lieu.telephone}`)}
                />
              )}
            </View>
          </View>
        ) : (
          <>
            <Texte variante="corpsFort">
              {m.commune} · {distance}
            </Texte>
            <Texte variante="legende" couleur="galet">
              {td.adresseApres}
            </Texte>
            {position && (
              <View style={styles.itineraireAvant}>
                <Lien
                  libelle={td.itineraire}
                  onPress={() => ouvrirItineraire(position)}
                  icone={<ArrowUpRight size={16} color={couleurs.pimentFonce} strokeWidth={2} />}
                />
              </View>
            )}
          </>
        )}
      </Ligne>

      {retour.type === 'assure' && (
        <Ligne icone={<Check size={20} color={couleurs.vacoa} strokeWidth={2.5} />} derniere={!aTenue}>
          <Texte variante="corpsFort" couleur="vacoa">
            {td.retourAssure}
          </Texte>
          <Texte variante="legende" couleur="galet">
            {td.retourAssureDetail}
          </Texte>
        </Ligne>
      )}
      {retour.type === 'bus' && (
        <Ligne icone={<Bus size={20} color={couleurs.galet} strokeWidth={2} />} derniere={!aTenue}>
          <Texte couleur="galet">{retour.texte}</Texte>
        </Ligne>
      )}

      {aTenue && (
        <Ligne icone={<Shirt size={20} color={couleurs.galet} strokeWidth={2} />} derniere>
          <Texte>{tenue}</Texte>
        </Ligne>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { backgroundColor: couleurs.blanc, borderRadius: rayons.carte },
  ligne: { flexDirection: 'row', gap: 16, padding: 16 },
  separee: { borderBottomWidth: 1, borderBottomColor: couleurs.trait },
  icone: { marginTop: 2 },
  contenu: { flex: 1 },
  lieu: { gap: 8 },
  actionsLieu: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  itineraireAvant: { flexDirection: 'row', marginTop: 8 },
});
