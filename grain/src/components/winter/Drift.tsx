import { useEffect, useState } from 'react';
import { player } from '../../lib/player';
import { fx } from '../../lib/fx';
import { toast } from '../../lib/ui';

/** Сугроб внизу окна растёт, пока играет музыка. Клик — разгрести. */
export function Drift() {
  const [sec, setSec] = useState(() => Number(sessionStorage.getItem('grain.drift') || 0));
  useEffect(() => {
    const id = setInterval(() => {
      if (!player.get().playing || document.hidden) return;
      setSec((s) => { const v = s + 5; sessionStorage.setItem('grain.drift', String(v)); return v; });
    }, 5000);
    return () => clearInterval(id);
  }, []);
  const h = Math.min(30, 3 + (sec / 60) * 0.9);
  if (h < 4) return null;
  const W = 1000;
  // неровная кромка: несколько волн разной длины
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 20) {
    const y = 40 - h * (0.55 + 0.25 * Math.sin(x / 70) + 0.2 * Math.sin(x / 23 + 1.7));
    pts.push(`${x} ${y.toFixed(1)}`);
  }
  return (
    <svg className="drift" viewBox={`0 0 ${W} 40`} preserveAspectRatio="none" aria-hidden>
      <path d={`M0 40 L${pts.join(' L')} L${W} 40 Z`}
        onClick={(e) => {
          fx.puff(e.clientX, e.clientY - 6, 40);
          setSec(0); sessionStorage.setItem('grain.drift', '0');
          toast(`Сугроб разгребли: ${Math.round(sec / 60)} мин музыки`);
        }}>
        <title>Сугроб растёт, пока играет музыка. Клик — разгрести</title>
      </path>
    </svg>
  );
}
