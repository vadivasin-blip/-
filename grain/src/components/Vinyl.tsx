import { useRef, useState } from 'react';
import { controls } from '../lib/player';
import { usePosition } from '../lib/hooks';
import { useStore } from '../lib/store';
import { settings } from '../lib/settings';
import { fmt } from '../lib/ui';

/** Пластинка: обложка на «яблоке», бороздки, неподвижный блик, вращение только во время музыки. */
export function Vinyl({ src, spinning, size, className = '' }: { src?: string; spinning: boolean; size?: number | string; className?: string }) {
  const spinOn = useStore(settings, (s) => s.spin);
  return (
    <div className={`vinyl ${spinning && spinOn ? 'spinning' : ''} ${className}`} style={size ? ({ '--vs': typeof size === 'number' ? `${size}px` : size } as React.CSSProperties) : undefined}>
      <div className="vinyl-disc">
        <div className="vinyl-label">{src ? <img src={src} alt="" draggable={false} /> : <span className="vinyl-blank" />}</div>
      </div>
      <div className="vinyl-sheen" />
      <div className="vinyl-hole" />
    </div>
  );
}

/**
 * Проигрыватель: платтер, пластинка, кольцо прогресса (тянется по кругу для перемотки)
 * и тонарм, который по ходу трека движется к центру — как на настоящем вертаке.
 */
export function Turntable({ src, playing, interactive = true }: { src?: string; playing: boolean; interactive?: boolean }) {
  const { pos, duration } = usePosition(6);
  const frac = duration ? Math.min(1, pos / duration) : 0;
  const ref = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const shown = drag ?? frac;

  const angleFrac = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    let a = Math.atan2(x, -y) / (Math.PI * 2);
    if (a < 0) a += 1;
    return a;
  };
  const nearRing = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(x, y) / (r.width / 2);
    return d > 0.86 && d < 1.02;
  };

  const R = 48.5, C = 2 * Math.PI * R;
  const dot = { x: 50 + R * Math.sin(shown * 2 * Math.PI), y: 50 - R * Math.cos(shown * 2 * Math.PI) };
  // тонарм: -28° — на подставке, от 4° (начало) до 24° (конец пластинки)
  const arm = playing || frac > 0.002 ? 4 + frac * 20 : -28;

  return (
    <div className={`turntable ${playing ? 'is-playing' : ''}`}>
      <div className="platter" />
      <Vinyl src={src} spinning={playing} />
      <svg ref={ref} className={`ring ${interactive ? 'interactive' : ''}`} viewBox="0 0 100 100"
        onPointerDown={(e) => {
          if (!interactive || !duration || !nearRing(e)) return;
          (e.target as Element).setPointerCapture(e.pointerId);
          setDrag(angleFrac(e));
        }}
        onPointerMove={(e) => {
          if (!interactive) return;
          if (drag !== null) setDrag(angleFrac(e));
          setHover(nearRing(e) ? angleFrac(e) : null);
        }}
        onPointerUp={(e) => { if (drag !== null) { controls.seek(angleFrac(e) * duration); setDrag(null); } }}
        onPointerLeave={() => setHover(null)}>
        <circle cx="50" cy="50" r={R} className="ring-track" />
        <circle cx="50" cy="50" r={R} className="ring-fill" strokeDasharray={`${C * shown} ${C}`} transform="rotate(-90 50 50)" />
        {duration > 0 && <circle cx={dot.x} cy={dot.y} r={drag !== null ? 1.9 : 1.4} className="ring-dot" />}
      </svg>
      {(hover !== null || drag !== null) && duration > 0 && (
        <div className="ring-tip mono">{fmt((drag ?? hover ?? 0) * duration)}</div>
      )}
      <Tonearm angle={arm} />
    </div>
  );
}

function Tonearm({ angle }: { angle: number }) {
  return (
    <svg className="tonearm" viewBox="0 0 60 200" style={{ transform: `rotate(${angle}deg)` }} aria-hidden>
      <circle cx="30" cy="22" r="17" className="arm-base" />
      <circle cx="30" cy="22" r="7" className="arm-pivot" />
      <rect x="22" y="2" width="16" height="10" rx="3" className="arm-weight" />
      <path d="M30 22 L30 150 Q30 162 22 170" className="arm-tube" />
      <rect x="11" y="166" width="16" height="24" rx="3" transform="rotate(28 19 178)" className="arm-head" />
    </svg>
  );
}
