import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Côté de la photo enregistrée, en pixels : nette à l'écran, légère sur le réseau (≈ 30 à 60 Ko). */
const COTE = 400;

/**
 * Choix d'une photo dans la galerie, recadrée au carré et compressée en JPEG.
 * Renvoie le JPEG en base64, null si annulé, « refus » si l'accès aux photos est refusé.
 */
export async function choisirPhoto(): Promise<string | null | 'refus'> {
  let resultat: ImagePicker.ImagePickerResult;
  try {
    resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
  } catch {
    return 'refus';
  }
  if (resultat.canceled || !resultat.assets[0]) return null;
  const { uri, width, height } = resultat.assets[0];

  // Recadrage au centre si l'image n'est pas déjà carrée (le recadrage manuel n'existe pas sur le web).
  const cote = Math.min(width, height);
  let contexte = ImageManipulator.manipulate(uri);
  if (width && height && width !== height) {
    contexte = contexte.crop({ originX: Math.floor((width - cote) / 2), originY: Math.floor((height - cote) / 2), width: cote, height: cote });
  }
  const image = await contexte.resize({ width: COTE, height: COTE }).renderAsync();
  const enregistree = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return enregistree.base64 ? enregistree.base64.replace(/^data:image\/\w+;base64,/, '') : null;
}
