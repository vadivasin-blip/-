import { useEffect, useMemo, useRef, useState } from 'react';
import { demoLyrics, getLyrics, offsets, type Lyrics } from '../lib/lyrics';
import { DEMO_LRC } from '../lib/demo';
import { auth } from '../lib/spotify';
import { controls } from '../lib/player';
import { usePosition } from '../lib/hooks';
import { useStore } from '../lib/store';
import { settings } from '../lib/settings';
import type { Track } from '../lib/types';
import { I } from './icons';

export function LyricsView({ track, big }: { track: Track | null; big?: boolean }) {
  const [state, setState] = useState<{ id: string; data: Lyrics | null; loading: boolean }>({ id: '', data: null, loading: false });
  const id = track?.id || track?.uri || '';
  const [offset, setOffset] = useState(0);
  const size = useStore(settings, (s) => s.lyricsSize);

  useEffect(() => {
    if (!track) return;
    setOffset(offsets.get(id));
    if (auth.isDemo()) { setState({ id, data: demoLyrics(DEMO_LRC), loading: false }); return; }
    let alive = true;
    setState({ id, data: null, loading: true });
    getLyrics(track).then((data) => alive && setState({ id, data, loading: false }));
    return () => { alive = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!track) return <div className="lyr-empty">Включите что-нибудь — здесь появится текст.</div>;
  if (state.loading || state.id !== id) return <div className="lyr-empty"><span className="spinner" /> Ищу текст…</div>;
  const l = state.data;
  if (!l || (!l.synced?.length && !l.plain)) {
    return (
      <div className="lyr-empty">
        {l?.instrumental ? 'Инструментальный трек — слов нет.' : 'Текст для этого трека не нашёлся.'}
        <small>Тексты берутся из открытой базы LRCLIB.</small>
      </div>
    );
  }
  if (!l.synced?.length) {
    return <div className={`lyrics plain size-${size} ${big ? 'big' : ''}`}>{l.plain!.split('\n').map((s, i) => <p key={i}>{s || ' '}</p>)}</div>;
  }
  return <Synced lines={l.synced} big={big} offset={offset} size={size}
    setOffset={(v) => { setOffset(v); offsets.set(id, v); }} source={l.source} />;
}

function Synced({ lines, big, offset, setOffset, size, source }: {
  lines: { t: number; text: string }[]; big?: boolean; offset: number; setOffset: (v: number) => void; size: string; source?: string;
}) {
  const { pos } = usePosition(8);
  const ref = useRef<HTMLDivElement>(null);
  const userScroll = useRef(0);
  const t = pos + offset;
  const active = useMemo(() => {
    let lo = 0, hi = lines.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (lines[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }, [lines, t]);

  useEffect(() => {
    if (Date.now() - userScroll.current < 3500) return;
    const box = ref.current;
    const el = box?.querySelector<HTMLElement>(`[data-i="${Math.max(0, active)}"]`);
    if (!box || !el) return;
    const target = el.offsetTop - box.clientHeight * 0.38;
    box.scrollTo({ top: target, behavior: 'smooth' });
  }, [active]);

  return (
    <div className="lyrics-wrap">
      <div className={`lyrics synced size-${size} ${big ? 'big' : ''}`} ref={ref}
        onWheel={() => (userScroll.current = Date.now())} onPointerDown={() => (userScroll.current = Date.now())}>
        <div className="lyr-pad" />
        {lines.map((ln, i) => (
          <p key={i} data-i={i}
            className={`${i === active ? 'on' : ''} ${i < active ? 'past' : ''} ${!ln.text ? 'gap' : ''}`}
            onClick={() => { userScroll.current = 0; controls.seek(ln.t - offset + 10); }}>
            {ln.text || '♪'}
          </p>
        ))}
        <div className="lyr-pad" />
      </div>
      <div className="lyr-tools">
        <span className="muted">Синхронизация</span>
        <button className="chip" onClick={() => setOffset(offset - 250)} title="Текст опережает — сдвинуть назад">−0.25 с</button>
        <span className="mono">{offset > 0 ? '+' : ''}{(offset / 1000).toFixed(2)}</span>
        <button className="chip" onClick={() => setOffset(offset + 250)} title="Текст отстаёт — сдвинуть вперёд">+0.25 с</button>
        {offset !== 0 && <button className="icon-btn xs" onClick={() => setOffset(0)} title="Сбросить"><I.close size={13} /></button>}
        {source && <span className="lyr-src">{source}</span>}
      </div>
    </div>
  );
}
