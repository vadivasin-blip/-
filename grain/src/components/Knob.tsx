import { useRef, useState } from 'react';

/** Поворотная ручка громкости: тянуть вверх/вниз, колесо мыши, стрелки; двойной клик — без звука. */
export function Knob({ value, onChange, onCommit, onDouble, label }: {
  value: number; onChange: (v: number) => void; onCommit: (v: number) => void; onDouble?: () => void; label: string;
}) {
  const start = useRef<{ y: number; v: number } | null>(null);
  const [active, setActive] = useState(false);
  const angle = -135 + value * 270;
  const R = 19, C = 2 * Math.PI * R, arc = C * 0.75;
  return (
    <div className={`knob ${active ? 'active' : ''}`} role="slider" tabIndex={0} aria-label={label}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} title={`${label}: ${Math.round(value * 100)}%`}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); start.current = { y: e.clientY, v: value }; setActive(true); }}
      onPointerMove={(e) => {
        if (!start.current) return;
        onChange(Math.max(0, Math.min(1, start.current.v + (start.current.y - e.clientY) / 160)));
      }}
      onPointerUp={(e) => {
        if (!start.current) return;
        const v = Math.max(0, Math.min(1, start.current.v + (start.current.y - e.clientY) / 160));
        start.current = null; setActive(false); onCommit(v);
      }}
      onDoubleClick={onDouble}
      onWheel={(e) => onCommit(Math.max(0, Math.min(1, value + (e.deltaY < 0 ? 0.04 : -0.04))))}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); onCommit(Math.min(1, value + 0.05)); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); onCommit(Math.max(0, value - 0.05)); }
      }}>
      <svg viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={R} className="knob-track" strokeDasharray={`${arc} ${C}`} transform="rotate(135 24 24)" />
        <circle cx="24" cy="24" r={R} className="knob-fill" strokeDasharray={`${arc * value} ${C}`} transform="rotate(135 24 24)" />
      </svg>
      <div className="knob-cap" style={{ transform: `rotate(${angle}deg)` }}><i /></div>
      {active && <span className="knob-val mono">{Math.round(value * 100)}</span>}
    </div>
  );
}
