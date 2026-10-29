import { LoaderCircle } from 'lucide-react';
import ui from './ui.module.css';

/** Spinner de la maquette : arc lucide, rotation linéaire 0,9 s. */
export function Spinner({ taille = 20 }: { taille?: number }) {
  return <LoaderCircle size={taille} strokeWidth={2.5} className={ui.spinner} aria-hidden />;
}
