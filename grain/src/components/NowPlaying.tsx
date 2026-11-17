import { useEffect, useState } from 'react';
import { controls, player } from '../lib/player';
import { useStore } from '../lib/store';
import { router, ui, year } from '../lib/ui';
import { img } from '../lib/types';
import { bridge } from '../lib/bridge';
import { usePosition } from '../lib/hooks';
import { I } from './icons';
import { LyricsView } from './LyricsView';
import { Transport } from './Controls';
import { DeckTime } from './Deck';
import { Turntable, Vinyl } from './Vinyl';
import { WindowControls } from './TopBar';

export function FullscreenNow() {
  const open = useStore(ui, (s) => s.fullscreen);
  const track = useStore(player, (s) => s.track);
  const liked = useStore(player, (s) => s.liked);
  const playing = useStore(player, (s) => s.playing);
  const [lyrics, setLyrics] = useState(() => localStorage.getItem('grain.fs.lyrics') !== '0');
  const [osFull, setOsFull] = useState(false);

  useEffect(() => { if (!open && osFull) { bridge.setFullscreen(false); setOsFull(false); } }, [open, osFull]);
  if (!open) return null;
  const close = () => ui.set({ fullscreen: false });
  const go = (fn: () => void) => { close(); fn(); };

  return (
    <div className={`fullnow ${lyrics ? 'with-lyrics' : ''}`}>
      <div className="fn-bg" />
      <div className="fn-top">
        <button className="icon-btn" onClick={close} title="Свернуть (Esc)"><I.collapse size={18} /></button>
        <div className="grow" />
        <button className={`chip ${lyrics ? 'on' : ''}`} onClick={() => { setLyrics(!lyrics); localStorage.setItem('grain.fs.lyrics', lyrics ? '0' : '1'); }}>
          <I.lyrics size={15} /> Текст
        </button>
        <button className="chip" onClick={() => { bridge.setFullscreen(!osFull); setOsFull(!osFull); }}>
          <I.expand size={14} /> {osFull ? 'Окно' : 'Весь экран'}
        </button>
        <WindowControls />
      </div>
      {track ? (
        <div className="fn-body">
          <div className="fn-left">
            <div className="fn-deck"><Turntable src={img(track.album?.images, 640)} playing={playing} /></div>
            <div className="fn-meta">
              <div className="fn-text">
                <div className="fn-title">{track.name}</div>
                <div className="fn-artists">
                  {track.artists.map((a, i) => <span key={a.id || i}>{i > 0 && ', '}<a onClick={() => a.id && go(() => router.go({ name: 'artist', id: a.id }))}>{a.name}</a></span>)}
                  {track.album?.name && <> · <a onClick={() => track.album.id && go(() => router.go({ name: 'album', id: track.album.id }))}>{track.album.name}</a></>}
                  {track.album?.release_date && <span className="mono"> · {year(track.album.release_date)}</span>}
                </div>
              </div>
              <button className={`icon-btn like ${liked ? 'on' : ''}`} onClick={controls.toggleLike}>{liked ? <I.heartFill size={22} /> : <I.heart size={22} />}</button>
            </div>
            <DeckTime />
            <Transport />
          </div>
          {lyrics && <div className="fn-right"><LyricsView track={track} big /></div>}
        </div>
      ) : <div className="lyr-empty">Ничего не играет</div>}
    </div>
  );
}

export function MiniPlayer() {
  const track = useStore(player, (s) => s.track);
  const playing = useStore(player, (s) => s.playing);
  const liked = useStore(player, (s) => s.liked);
  const { pos, duration } = usePosition(4);
  return (
    <div className="mini">
      <div className="mini-disc"><Vinyl src={img(track?.album?.images, 200)} spinning={playing} size={96} /></div>
      <div className="mini-main">
        <div className="mini-top">
          <div className="mini-text">
            <div className="mini-title">{track?.name ?? 'Ничего не играет'}</div>
            <div className="mini-artist">{track?.artists.map((a) => a.name).join(', ')}</div>
          </div>
          <button className="icon-btn xs nodrag" onClick={() => bridge.setMini(false)} title="Развернуть"><I.expand size={14} /></button>
          <button className="icon-btn xs nodrag" onClick={bridge.close} title="Закрыть"><I.close size={14} /></button>
        </div>
        <div className="mini-controls nodrag">
          <button className={`icon-btn xs like ${liked ? 'on' : ''}`} onClick={controls.toggleLike}>{liked ? <I.heartFill size={15} /> : <I.heart size={15} />}</button>
          <Transport small />
          <button className="icon-btn xs" onClick={() => controls.setVolume(player.get().volume - 10)} title="Тише"><I.volLow size={15} /></button>
        </div>
      </div>
      <div className="mini-progress nodrag" onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        duration && controls.seek(((e.clientX - r.left) / r.width) * duration);
      }}><i style={{ width: `${duration ? (pos / duration) * 100 : 0}%` }} /></div>
    </div>
  );
}
