'use client';

import { useEffect } from 'react';
import { MonitorDown } from 'lucide-react';
import { textesEcrans } from '@kivien/core';
import { preparerInstallation, useInstallation } from '@/lib/installation';
import p from './pages.module.css';
import ui from './ui.module.css';

const ti = textesEcrans.resto.installation;

/** Sur tout le site : service worker et écoute de l'invitation à installer. N'affiche rien. */
export function PreparerInstallation() {
  useEffect(() => preparerInstallation(), []);
  return null;
}

/** Entrée du menu de l'espace pro, visible seulement quand le navigateur propose l'installation. */
export function BoutonInstaller({ className }: { className?: string }) {
  const { etat, installer } = useInstallation();
  if (etat !== 'installable') return null;
  return (
    <button type="button" className={className} onClick={() => void installer()}>
      <MonitorDown size={20} strokeWidth={2} aria-hidden />
      {ti.installer}
    </button>
  );
}

/** Mon compte : installer l'espace pro comme une application, selon le navigateur. */
export function CarteInstallation({ className }: { className?: string }) {
  const { etat, installer } = useInstallation();
  if (!etat || etat === 'masquee') return null;
  return (
    <section className={className} aria-labelledby="installation">
      <h2 id="installation" className={`${p.ligne} ${ui.corpsFort}`}>
        <MonitorDown size={18} strokeWidth={2} aria-hidden />
        {ti.titre}
      </h2>
      {etat === 'installee' ? (
        <p className={`${ui.legendeForte} ${ui.vacoa}`} role="status">
          {ti.installee}
        </p>
      ) : (
        <>
          <p className={`${ui.corps} ${ui.galet}`}>{ti.texte}</p>
          {etat === 'installable' ? (
            <button type="button" className={ui.boutonSecondaire} onClick={() => void installer()}>
              {ti.installer}
            </button>
          ) : (
            <p className={ui.legende}>
              {etat === 'safari' ? ti.safari : etat === 'ios' ? ti.ios : ti.autre}
            </p>
          )}
        </>
      )}
    </section>
  );
}
