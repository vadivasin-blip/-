import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTimeline, demoLyrics, getLyrics, offsets, type Lyrics } from '../lib/lyrics';
import { DEMO_LRC } from '../lib/demo';
import { auth } from '../lib/spotify';
import { controls, positionNow } from '../lib/player';
import { toast } from '../lib/ui';
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
  lines: { t: number; text: string; words?: { t: number; text: string }[] }[]; big?: boolean; offset: number; setOffset: (v: number) => void; size: string; source?: string;
}) {
  const { pos, duration } = usePosition(10);
  const ref = useRef<HTMLDivElement>(null);
  const userScroll = useRef(0);
  const timeline = useMemo(() => buildTimeline(lines, duration || (lines[lines.length - 1]?.t ?? 0) + 8000), [lines, duration]);
  const t = pos + offset;
  const active = useMemo(() => {
    let lo = 0, hi = timeline.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (timeline[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }, [timeline, t]);

  // плавная прокрутка: активная строка держится в верхней трети
  useEffect(() => {
    if (Date.now() - userScroll.current < 3500) return;
    const box = ref.current;
    const el = box?.querySelector<HTMLElement>(`[data-i="${Math.max(0, active)}"]`);
    if (!box || !el) return;
    box.scrollTo({ top: el.offsetTop - box.clientHeight * 0.32, behavior: 'smooth' });
  }, [active]);

  // заливка слов — 60 кадров в секунду напрямую в DOM, без перерисовки React
  useEffect(() => {
    const line = timeline[active];
    const el = ref.current?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    if (!line || !el) return;
    const spans = Array.from(el.querySelectorAll<HTMLElement>('.w'));
    let raf = 0;
    const last: number[] = [];
    const frame = () => {
      const now = positionNow() + offset;
      line.words.forEach((w, j) => {
        const p = now <= w.t0 ? 0 : now >= w.t1 ? 1 : (now - w.t0) / (w.t1 - w.t0);
        const v = Math.round(p * 1000) / 1000;
        if (last[j] !== v && spans[j]) { spans[j].style.setProperty('--p', String(v)); last[j] = v; }
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, timeline, offset]);

  // «Подогнать»: нажали в момент начала строки — ближайшая строка встаёт ровно сюда
  const snap = () => {
    const now = positionNow();
    let best: number | null = null;
    for (const l of timeline) {
      if (!l.text) continue;
      const d = l.t - now;
      if (Math.abs(d) <= 4000 && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
    if (best === null) return toast('Рядом нет начала строки — нажмите, когда певец начнёт новую строку.');
    const v = Math.round(best / 50) * 50;
    setOffset(v);
    toast(`Сдвиг ${v > 0 ? '+' : ''}${(v / 1000).toFixed(2)} с — сохранён для этого трека`);
  };

  return (
    <div className="lyrics-wrap">
      <div className={`lyrics synced size-${size} ${big ? 'big' : ''}`} ref={ref}
        onWheel={() => (userScroll.current = Date.now())} onPointerDown={() => (userScroll.current = Date.now())}>
        <div className="lyr-pad top" />
        {timeline.map((ln, i) => {
          const dist = active < 0 ? i + 1 : Math.abs(i - active);
          return (
            <p key={i} data-i={i}
              className={`${i === active ? 'on' : ''} ${i < active ? 'past' : ''} ${!ln.text ? 'gap' : ''}`}
              style={{ '--blur': `${Math.min(2.2, Math.max(0, dist - 1) * 0.7)}px` } as React.CSSProperties}
              onClick={() => { userScroll.current = 0; controls.seek(ln.t - offset + 10); }}>
              {!ln.text ? <span className="gap-dots"><i /><i /><i /></span>
                : i === active ? ln.words.map((w, j) => <span key={j} className="w">{w.text}{j < ln.words.length - 1 ? ' ' : ''}</span>)
                  : ln.text}
            </p>
          );
        })}
        <div className="lyr-pad" />
      </div>
      <div className="lyr-tools">
        <span className="muted">Синхр.</span>
        <button className="chip" onClick={() => setOffset(offset - 100)} title="Текст опережает — сдвинуть назад">−0.1</button>
        <span className="mono">{offset > 0 ? '+' : ''}{(offset / 1000).toFixed(2)}</span>
        <button className="chip" onClick={() => setOffset(offset + 100)} title="Текст отстаёт — сдвинуть вперёд">+0.1</button>
        <button className="chip snap" onClick={snap} title="Нажмите ровно в момент, когда начинается строка">Подогнать</button>
        {offset !== 0 && <button className="icon-btn xs" onClick={() => setOffset(0)} title="Сбросить"><I.close size={13} /></button>}
        {source && <span className="lyr-src" title={timeline.some((l) => l.exact) ? 'Точное время каждого слова' : 'Время слов рассчитано по слогам'}>{timeline.some((l) => l.exact) ? 'по словам' : 'по слогам'} · {source}</span>}
      </div>
    </div>
  );
}
