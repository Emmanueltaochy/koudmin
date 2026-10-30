// Contrat en PDF pour l'app web (app.kivien.re) : même mise en page que le PDF de l'espace pro (apps/resto/lib/contratPdf.ts).
import { textesEcrans, type Article } from '@kivien/core';
import type { SignaturesContrat } from '../donnees';

const tc = textesEcrans.resto.contrat;

/** Police PDF standard (WinAnsi) : espaces insécables fines et symboles hors jeu remplacés. */
const propre = (t: string) => t.replace(/[  ]/g, ' ').replace(/≈/g, 'env.');

/** « 30/10/2026 à 15:47 », heure de La Réunion. */
function dateHeure(iso: string) {
  const d = new Date(iso);
  const jour = d.toLocaleDateString('fr-FR', { timeZone: 'Indian/Reunion' });
  const heure = d.toLocaleTimeString('fr-FR', { timeZone: 'Indian/Reunion', hour: '2-digit', minute: '2-digit' });
  return `${jour} à ${heure}`;
}

/** Signature en PNG (jsPDF n'insère pas le SVG) : le tracé de l'app extra est redessiné sur un canevas. */
async function enPng(image: string): Promise<string> {
  if (image.startsWith('data:image/png')) return image;
  const img = new Image();
  img.src = image;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = 600;
  c.height = Math.round((600 * (img.naturalHeight || 160)) / (img.naturalWidth || 300));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

/**
 * Contrat d'extra en PDF (A4), texte du contrat puis signatures des deux parties,
 * téléchargé sous `nomFichier`.
 */
export async function telechargerContratPdf(c: {
  titre: string;
  articles: Article[];
  employeur: string;
  salarie: string;
  signatures: SignaturesContrat;
  nomFichier: string;
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marge = 20;
  const largeur = 210 - 2 * marge;
  let y = 24;
  const place = (h: number) => {
    if (y + h > 280) {
      doc.addPage();
      y = 24;
    }
  };

  doc.setFont('helvetica', 'bold').setFontSize(16).text(propre(c.titre), marge, y);
  y += 6;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110).text("CDD d'usage · Kivien", marge, y);
  doc.setTextColor(33);
  y += 10;

  c.articles.forEach((a, i) => {
    const lignes = doc.setFont('helvetica', 'normal').setFontSize(10.5).splitTextToSize(propre(a.texte), largeur) as string[];
    place(8 + lignes.length * 5);
    doc.setFont('helvetica', 'bold').setFontSize(11).text(propre(`${i + 1}. ${a.titre}`), marge, y);
    y += 6;
    doc.setFont('helvetica', 'normal').setFontSize(10.5).text(lignes, marge, y);
    y += lignes.length * 5 + 5;
  });

  place(60);
  y += 4;
  const colonne = largeur / 2 - 4;
  const parties: [string, string, SignaturesContrat['restaurant']][] = [
    ["L'employeur", c.employeur, c.signatures.restaurant],
    ['Le salarié ou la salariée', c.salarie, c.signatures.extra],
  ];
  for (const [i, [role, nom, sig]] of parties.entries()) {
    const x = marge + i * (colonne + 8);
    doc.setFont('helvetica', 'bold').setFontSize(10).text(propre(role), x, y);
    doc.setFont('helvetica', 'normal').text(propre(nom), x, y + 5);
    doc.setDrawColor(200).roundedRect(x, y + 8, colonne, 32, 2, 2);
    if (sig) {
      doc.addImage(await enPng(sig.image), 'PNG', x + 2, y + 10, colonne - 4, 28, undefined, 'FAST');
      doc.setFontSize(8.5).setTextColor(110).text(propre(tc.signePar(nom, dateHeure(sig.le))), x, y + 45, { maxWidth: colonne });
    } else {
      doc.setFontSize(8.5).setTextColor(110).text(propre(tc.enAttenteSignature(nom)), x, y + 45, { maxWidth: colonne });
    }
    doc.setTextColor(33);
  }

  doc.save(c.nomFichier);
}
