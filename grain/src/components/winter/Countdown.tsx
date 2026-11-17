import { useEffect, useRef, useState } from 'react';
import { countdownParts } from '../../lib/season';
import { fx } from '../../lib/fx';
import { plural, toast } from '../../lib/ui';

/** Отсчёт до Нового года. В полночь — салют. */
export function Countdown() {
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const c = countdownParts(now);
  useEffect(() => {
    // наступил: в первые минуты января
    const d = new Date(now);
    if (!fired.current && d.getMonth() === 0 && d.getDate() === 1 && d.getHours() === 0 && d.getMinutes() < 1) {
      fired.current = true;
      fx.fireworks(40);
      toast(`С Новым ${d.getFullYear()} годом!`);
    }
  }, [now]);
  const p2 = (n: number) => String(n).padStart(2, '0');
  const label = c.days >= 1
    ? <>{plural(c.days, 'день', 'дня', 'дней')} <span className="mono">{p2(c.h)}:{p2(c.m)}</span></>
    : <span className="mono">{p2(c.h)}:{p2(c.m)}:{p2(c.s)}</span>;
  return (
    <button className="countdown" onClick={() => fx.fireworks(6)} title="Нажмите — маленький салют">
      <span className="cd-star">✳</span>
      <span className="cd-label">до {c.year}</span>
      <span className="cd-value">{label}</span>
    </button>
  );
}
