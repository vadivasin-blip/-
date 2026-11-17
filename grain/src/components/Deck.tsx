import { useEffect } from 'react';
import { controls, player, refreshQueue } from '../lib/player';
import { useStore } from '../lib/store';
import { fmt, router, ui, year } from '../lib/ui';
import { usePosition } from '../lib/hooks';
import { bridge } from '../lib/bridge';
import { img, type Track } from '../lib/types';
import { Cover } from './Cover';
import { I } from './icons';
import { LyricsView } from './LyricsView';
import { showTrackMenu } from './trackMenu';
import { contextLabel } from './contextLabel';
import { Turntable, Vinyl } from './Vinyl';
import { DeviceButton, Progress, SleepButton, Transport, VolumeKnob } from './Controls';

type Mode = 'now' | 'lyrics' | 'queue';

/** Дека — постоянная левая колонка с проигрывателем. Главный элемент интерфейса Grain. */
export function Deck() {
  const panel = useStore(ui, (s) => s.panel) ?? 'now';
  const mode: Mode = panel === 'lyrics' || panel === 'queue' ? panel : 'now';
  const track = useStore(player, (s) => s.track);
  const playing = useStore(player, (s) => s.playing);
  const liked = useStore(player, (s) => s.liked);
  const { device, sdkDeviceId } = useStore(player, (s) => ({ device: s.device, sdkDeviceId: s.sdkDeviceId }));
  const remote = device && device.id !== sdkDeviceId && device.name !== 'Grain' ? device.name : null;
  const cover = img(track?.album?.images, 640);

  return (
    <aside className={`deck mode-${mode}`}>
      {mode === 'now' ? (
        <div className="deck-stage" onDoubleClick={() => ui.set({ fullscreen: true })} title="Двойной клик — во весь экран">
          <Turntable src={cover} playing={playing} />
        </div>
      ) : null}

      <div className="deck-info">
        {mode !== 'now' && (
          <button className="deck-mini-vinyl" onClick={() => ui.set({ panel: 'now' })} title="Показать пластинку">
            <Vinyl src={img(track?.album?.images, 200)} spinning={playing} size={68} />
          </button>
        )}
        <div className="deck-text">
          {track ? (
            <>
              <div className="deck-title" title={track.name}>{track.name}</div>
              <div className="deck-artists">
                {track.artists.map((a, i) => <span key={a.id || i}>{i > 0 && ', '}<a onClick={() => a.id && router.go({ name: 'artist', id: a.id })}>{a.name}</a></span>)}
              </div>
              {mode === 'now' && track.album?.name && (
                <div className="deck-album">
                  <a onClick={() => track.album.id && router.go({ name: 'album', id: track.album.id })}>{track.album.name}</a>
                  {track.album.release_date && <span className="mono"> · {year(track.album.release_date)}</span>}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="deck-title muted">Тишина</div>
              <div className="deck-artists">Поставьте пластинку — выберите трек, альбом или плейлист</div>
            </>
          )}
        </div>
        <button className={`icon-btn like ${liked ? 'on' : ''}`} onClick={controls.toggleLike} disabled={!track} title="Нравится (L)">
          {liked ? <I.heartFill size={19} /> : <I.heart size={19} />}
        </button>
      </div>

      {mode === 'now' ? <DeckTime /> : <div className="deck-progress"><Progress /></div>}

      <div className="deck-transport"><Transport /></div>

      <div className="deck-utils">
        <VolumeKnob />
        <div className="deck-utils-right">
          <SleepButton />
          <DeviceButton />
          <button className="icon-btn" title="Мини-плеер (Ctrl+M)" onClick={() => bridge.setMini(true)}><I.mini size={18} /></button>
          <button className="icon-btn" title="Во весь экран (F)" onClick={() => ui.set({ fullscreen: true })}><I.expand size={17} /></button>
        </div>
      </div>
      {remote && <div className="deck-remote"><I.device size={14} /> Играет на «{remote}»</div>}

      <div className="deck-tabs" role="tablist">
        {([['now', 'Пластинка'], ['lyrics', 'Текст'], ['queue', 'Очередь']] as [Mode, string][]).map(([k, l]) => (
          <button key={k} role="tab" className={mode === k ? 'on' : ''} onClick={() => ui.set({ panel: k })}>{l}</button>
        ))}
      </div>
      <div className="deck-body">
        {mode === 'now' && <UpNext />}
        {mode === 'lyrics' && <LyricsView track={track} />}
        {mode === 'queue' && <QueueList />}
      </div>
    </aside>
  );
}

export function DeckTime() {
  const { pos, duration } = usePosition(2);
  return (
    <div className="deck-time mono">
      <span>{fmt(pos)}</span>
      <i />
      <span>{fmt(duration)}</span>
    </div>
  );
}

function UpNext() {
  const ctx = useStore(player, (s) => s.contextUri);
  const queue = useStore(player, (s) => s.queue);
  const c = ctx ? contextLabel(ctx) : null;
  return (
    <div className="upnext">
      {c && (
        <div className="upnext-ctx">
          <span className="section-label">Играет из</span>
          <a onClick={c.go}>{c.label}</a>
        </div>
      )}
      {queue.length > 0 && (
        <>
          <div className="section-label pad">Дальше на этой стороне</div>
          {queue.slice(0, 4).map((t, i) => <QueueItem key={t.uri + i} t={t} skip={i + 1} />)}
        </>
      )}
    </div>
  );
}

function QueueList() {
  const { queue, track } = useStore(player, (s) => ({ queue: s.queue, track: s.track }));
  useEffect(() => { refreshQueue(); }, []);
  return (
    <div className="queue">
      {track && (<><div className="section-label pad">Сейчас</div><QueueItem t={track} current /></>)}
      <div className="section-label pad">Далее {queue.length > 0 && <span className="mono">· {queue.length}</span>}</div>
      {queue.length === 0 && <div className="lyr-empty small">Очередь пуста. Нажмите Q на треке или «Добавить в очередь» в меню.</div>}
      {queue.map((t, i) => <QueueItem key={t.uri + i} t={t} skip={i + 1} />)}
    </div>
  );
}

function QueueItem({ t, current, skip }: { t: Track; current?: boolean; skip?: number }) {
  const jump = async () => {
    if (!skip || skip > 15) return;
    for (let i = 0; i < skip; i++) await controls.next();
  };
  return (
    <div className={`q-item ${current ? 'current' : ''}`} onDoubleClick={jump} onContextMenu={(e) => showTrackMenu(e, t)}
      title={skip ? 'Двойной клик — перейти к этому треку' : undefined}>
      <Cover src={img(t.album?.images, 64)} size={36} />
      <div className="q-text">
        <div className="q-name">{t.name}</div>
        <div className="q-artist">{t.artists?.map((a) => a.name).join(', ')}</div>
      </div>
      <span className="mono q-dur">{fmt(t.duration_ms)}</span>
    </div>
  );
}
