import { useEffect, useState } from 'react';
import { bridge, type NowInfo } from '../lib/bridge';
import { resolveTheme } from '../lib/season';
import type { ThemeMode } from '../lib/settings';
import { fmt } from '../lib/ui';
import { I } from './icons';
import { Vinyl } from './Vinyl';
import { Slider } from './Slider';

/** Мини-панель у значка Grain в трее: обложка-пластинка, название и кнопки. Окно отдельное, звук и логика — в главном окне. */
export function TrayFlyout() {
  const [info, setInfo] = useState<NowInfo | null>(null);
  const [got, setGot] = useState(performance.now());
  const [, tick] = useState(0);
  const [vol, setVol] = useState<number | null>(null);

  useEffect(() => bridge.onFlyout((v) => { setInfo(v); setGot(performance.now()); setVol(null); }), []);
  useEffect(() => {
    if (!info?.playing) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [info?.playing]);
  useEffect(() => {
    document.documentElement.dataset.theme = resolveTheme((info?.theme as ThemeMode) || 'winter');
    if (info?.accent) document.documentElement.style.setProperty('--accent', info.accent);
  }, [info?.theme, info?.accent]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.close();
      if (e.key === ' ') { e.preventDefault(); bridge.flyoutCmd('toggle'); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const cmd = (c: string) => bridge.flyoutCmd(c);
  const dur = info?.duration || 0;
  const pos = Math.min(dur, (info?.position || 0) + (info?.playing ? performance.now() - got : 0));
  const v = vol ?? (info?.muted ? 0 : info?.volume ?? 70);

  return (
    <div className="flyout">
      <button className="fl-disc" onClick={() => cmd('open')} title="Открыть Grain">
        <Vinyl src={info?.cover} spinning={!!info?.playing} size={128} />
      </button>
      <div className="fl-main">
        <div className="fl-top">
          <div className="fl-text">
            <div className="fl-title">{info?.title ?? 'Ничего не играет'}</div>
            <div className="fl-artist">{info?.artist ?? 'Включите трек в Grain'}</div>
          </div>
          <button className="icon-btn xs" onClick={() => cmd('mini')} title="Мини-плеер"><I.mini size={15} /></button>
          <button className="icon-btn xs" onClick={() => cmd('open')} title="Открыть Grain"><I.expand size={14} /></button>
        </div>
        <div className="fl-controls">
          <button className={`icon-btn xs like ${info?.liked ? 'on' : ''}`} onClick={() => cmd('like')} title="Нравится">
            {info?.liked ? <I.heartFill size={16} /> : <I.heart size={16} />}
          </button>
          <button className="icon-btn" onClick={() => cmd('prev')} title="Предыдущий"><I.prev size={17} /></button>
          <button className="play-btn" onClick={() => cmd('toggle')} title="Играть / пауза">
            {info?.playing ? <I.pause size={17} /> : <I.play size={17} />}
          </button>
          <button className="icon-btn" onClick={() => cmd('next')} title="Следующий"><I.next size={17} /></button>
          <button className={`icon-btn xs toggle ${info?.shuffle ? 'on' : ''}`} onClick={() => cmd('shuffle')} title="Перемешать"><I.shuffle size={15} /></button>
        </div>
        <div className="fl-bottom">
          <button className="icon-btn xs" onClick={() => cmd('mute')} title="Без звука">{v === 0 ? <I.mute size={15} /> : <I.volLow size={15} />}</button>
          <Slider value={v / 100} ariaLabel="Громкость" className="fl-vol" step={0.05}
            onChange={(x) => setVol(Math.round(x * 100))} onCommit={(x) => { setVol(Math.round(x * 100)); cmd('vol:' + Math.round(x * 100)); }} />
          <span className="fl-time mono">{fmt(pos)} / {fmt(dur)}</span>
        </div>
      </div>
      <div className="fl-progress" onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (dur) cmd('seek:' + Math.round(((e.clientX - r.left) / r.width) * dur));
      }}><i style={{ width: `${dur ? (pos / dur) * 100 : 0}%` }} /></div>
    </div>
  );
}
