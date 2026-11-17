import { useEffect, useRef, useState } from 'react';
import { player } from '../../lib/player';
import { useStore } from '../../lib/store';

const COLORS = ['#ff5b4f', '#ffc94d', '#58d68d', '#62b0ff', '#ff86d0'];

/** Гирлянда под верхней панелью: бегущие огни во время музыки, ровное тёплое свечение на паузе. */
export function Garland() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1200);
  const playing = useStore(player, (s) => s.playing);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const span = 150;
  const n = Math.max(2, Math.round(w / span));
  const seg = w / n;
  const sag = 12;
  let d = 'M0 2';
  const bulbs: { x: number; y: number; a: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = i * seg, x1 = x0 + seg;
    d += ` Q${x0 + seg / 2} ${2 + sag * 2} ${x1} 2`;
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const x = x0 + seg * t;
      const y = 2 + 2 * t * (1 - t) * sag * 2;
      const slope = (1 - 2 * t) * sag * 4 / seg;
      bulbs.push({ x, y, a: Math.atan(slope) * 57 });
    }
  }

  return (
    <div ref={ref} className={`garland ${playing ? 'playing' : ''}`} aria-hidden>
      <svg width={w} height={40} viewBox={`0 0 ${w} 40`}>
        <path d={d} className="wire" />
        {bulbs.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.a})`} style={{ '--i': i, '--c': COLORS[i % COLORS.length] } as React.CSSProperties} className="bulb">
            <rect x={-2.5} y={0} width={5} height={4} rx={1} className="cap" />
            <ellipse cx={0} cy={9} rx={3.6} ry={5.6} className="glass" />
          </g>
        ))}
      </svg>
    </div>
  );
}
