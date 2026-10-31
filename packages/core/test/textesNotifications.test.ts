import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIBELLES_POSTE, textesNotifications } from '../src';

// Le script du VPS envoie ces e-mails : il doit reprendre les textes de core mot pour mot.
const script = readFileSync(join(__dirname, '../../../deploy/vps/notifications.sh'), 'utf8');

describe('e-mails automatiques', () => {
  it('le script du VPS reprend chaque texte de core', () => {
    for (const m of Object.values(textesNotifications)) {
      for (const t of [m.sujet, ...m.paragraphes, m.bouton, m.pied])
        expect(script).toContain(JSON.stringify(t));
    }
  });

  it('le script du VPS nomme chaque poste comme les apps', () => {
    for (const [poste, l] of Object.entries(LIBELLES_POSTE))
      expect(script).toContain(`${JSON.stringify(poste)}: ${JSON.stringify(l.mission)}`);
  });

  it('chaque modèle a ses champs connus seulement', () => {
    const connus = [
      'prenom',
      'extra',
      'restaurant',
      'commune',
      'poste',
      'jour',
      'horaire',
      'distance',
    ];
    for (const m of Object.values(textesNotifications)) {
      for (const [, champ] of [m.sujet, ...m.paragraphes].join(' ').matchAll(/\{(\w+)\}/g))
        expect(connus).toContain(champ);
    }
  });
});
