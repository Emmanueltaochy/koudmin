import { Image, StyleSheet, View } from 'react-native';
import { initiales } from '@kivien/core';
import { couleurs } from './theme';
import { Texte } from './Texte';

/** Photo de profil ronde, ou initiales sur fond galet sans photo. */
export function Avatar({ photo, prenom, nom, taille = 96, alt }: { photo: string | null; prenom: string; nom: string; taille?: number; alt: string }) {
  const forme = { width: taille, height: taille, borderRadius: taille / 2 };
  return photo ? (
    <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={[styles.image, forme]} accessibilityLabel={alt} accessibilityRole="image" />
  ) : (
    <View style={[styles.vide, forme]} accessibilityLabel={alt} accessibilityRole="image">
      <Texte variante="titre" couleur="blanc">
        {initiales(prenom, nom)}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: couleurs.trait },
  vide: { backgroundColor: couleurs.galet, alignItems: 'center', justifyContent: 'center' },
});
