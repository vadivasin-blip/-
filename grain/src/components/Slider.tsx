import { useRef, useState } from 'react';

type Props = {
  value: number; // 0..1
  onChange?: (v: number) => void;
  onCommit: (v: number) => void;
  label?: (v: number) => string;
  className?: string;
  ariaLabel: string;
  step?: number;
};

/** Слайдер на pointer-событиях: перетаскивание, клик, колесо, стрелки. */
export function Slider({ value, onChange, onCommit, label, className = '', ariaLabel, step = 0.02 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const v = drag ?? value;

  const at = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };

  return (
    <div
      ref={ref}
      className={`slider ${drag !== null ? 'dragging' : ''} ${className}`}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      tabIndex={0}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const x = at(e.clientX); setDrag(x); onChange?.(x);
      }}
      onPointerMove={(e) => {
        const x = at(e.clientX);
        setHover(x);
        if (drag !== null) { setDrag(x); onChange?.(x); }
      }}
      onPointerUp={(e) => { if (drag !== null) { onCommit(at(e.clientX)); setDrag(null); } }}
      onPointerLeave={() => setHover(null)}
      onWheel={(e) => { onCommit(Math.max(0, Math.min(1, value + (e.deltaY < 0 ? step : -step)))); }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); onCommit(Math.min(1, value + step)); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); onCommit(Math.max(0, value - step)); }
      }}
    >
      <div className="track">
        <div className="fill" style={{ width: `${v * 100}%` }} />
        {hover !== null && drag === null && <div className="ghost" style={{ width: `${hover * 100}%` }} />}
      </div>
      <div className="thumb" style={{ left: `${v * 100}%` }} />
      {label && (hover !== null || drag !== null) && (
        <div className="slider-tip mono" style={{ left: `${(drag ?? hover ?? 0) * 100}%` }}>{label(drag ?? hover ?? 0)}</div>
      )}
    </div>
  );
}
