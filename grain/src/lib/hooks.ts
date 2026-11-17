import { useEffect, useState } from 'react';
import { player, positionNow } from './player';
import { useStore } from './store';

/** Текущая позиция трека, обновляется несколько раз в секунду только пока играет. */
export function usePosition(hz = 4) {
  const s = useStore(player, (s) => ({ playing: s.playing, position: s.position, stamp: s.stamp, duration: s.duration }));
  const [, tick] = useState(0);
  useEffect(() => {
    if (!s.playing) return;
    const id = setInterval(() => tick((n) => n + 1), 1000 / hz);
    return () => clearInterval(id);
  }, [s.playing, hz]);
  return { pos: positionNow({ ...player.get(), ...s }), duration: s.duration, playing: s.playing };
}

export function useKey(handler: (e: KeyboardEvent) => void, deps: any[] = []) {
  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useClickOutside(ref: React.RefObject<HTMLElement | null>, close: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    setTimeout(() => document.addEventListener('mousedown', h));
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [active, close, ref]);
}
