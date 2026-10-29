import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensCss } from '../src/css';

const sortie = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'tokens.css');
mkdirSync(dirname(sortie), { recursive: true });
writeFileSync(sortie, tokensCss());
console.log(`tokens.css écrit dans ${sortie}`);
