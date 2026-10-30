'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import s from './PaveSignature.module.css';

export interface PaveSignatureRef {
  /** Image PNG en data URL, ou null si rien n'a été tracé. */
  image(): string | null;
  effacer(): void;
}

/** Signature au doigt ou à la souris (Pointer Events), tracé basalte sur fond blanc. */
export const PaveSignature = forwardRef<PaveSignatureRef, { libelle: string; erreur?: boolean; onTrace?: () => void }>(
  function PaveSignature({ libelle, erreur, onTrace }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const [trace, setTrace] = useState(false);
    const dernier = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
      const c = canvas.current;
      if (!c) return;
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = c.getBoundingClientRect();
      c.width = Math.round(width * ratio);
      c.height = Math.round(height * ratio);
      const ctx = c.getContext('2d')!;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#211C18';
      // Safari sur iPhone : sans ce blocage, le doigt fait défiler la page au lieu de signer.
      const bloquer = (e: TouchEvent) => e.preventDefault();
      c.addEventListener('touchstart', bloquer, { passive: false });
      c.addEventListener('touchmove', bloquer, { passive: false });
      return () => {
        c.removeEventListener('touchstart', bloquer);
        c.removeEventListener('touchmove', bloquer);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      image: () => (trace && canvas.current ? canvas.current.toDataURL('image/png') : null),
      effacer: () => {
        const c = canvas.current;
        c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
        setTrace(false);
      },
    }));

    function point(e: React.PointerEvent<HTMLCanvasElement>) {
      const r = e.currentTarget.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    return (
      <canvas
        ref={canvas}
        className={s.pave}
        data-erreur={!!erreur}
        role="img"
        aria-label={libelle}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dernier.current = point(e);
        }}
        onPointerMove={(e) => {
          if (!dernier.current) return;
          const ctx = e.currentTarget.getContext('2d')!;
          const p = point(e);
          ctx.beginPath();
          ctx.moveTo(dernier.current.x, dernier.current.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          dernier.current = p;
          if (!trace) {
            setTrace(true);
            onTrace?.();
          }
        }}
        onPointerUp={() => (dernier.current = null)}
        onPointerCancel={() => (dernier.current = null)}
      />
    );
  },
);
