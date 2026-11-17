import { useEffect } from 'react';
import { controls, player, refreshQueue } from '../lib/player';
import { useStore } from '../lib/store';
import { router, ui, year, fmt } from '../lib/ui';
import { img, type Track } from '../lib/types';
import { Cover } from './Cover';
import { I } from './icons';
import { LyricsView } from './LyricsView';
import { showTrackMenu } from './trackMenu';
import { contextLabel } from './contextLabel';

export function RightPanel() {
  const panel = useStore(ui, (s) => s.panel);
  const track = useStore(player, (s) => s.track);
  if (!panel) return null;
  const tabs: [typeof panel, string][] = [['now', 'Сейчас'], ['lyrics', 'Текст'], ['queue', 'Очередь']];
  return (
    <aside className="rightpanel">
      <div className="rp-tabs">
        {tabs.map(([k, l]) => (
          <button key={k} className={`rp-tab ${panel === k ? 'on' : ''}`} onClick={() => ui.set({ panel: k })}>{l}</button>
        ))}
        <button className="icon-btn xs rp-close" onClick={() => ui.set({ panel: null })} title="Скрыть панель"><I.close size={14} /></button>
      </div>
      <div className="rp-body">
        {panel === 'now' && <NowCard track={track} />}
        {panel === 'lyrics' && <LyricsView track={track} />}
        {panel === 'queue' && <QueueList />}
      </div>
    </aside>
  );
}

function NowCard({ track }: { track: Track | null }) {
  const ctx = useStore(player, (s) => s.contextUri);
  const queue = useStore(player, (s) => s.queue);
  if (!track) return <div className="lyr-empty">Здесь будет то, что играет.<small>Выберите трек, альбом или плейлист.</small></div>;
  return (
    <div className="nowcard">
      <button className="nc-cover" onClick={() => ui.set({ fullscreen: true })} title="Во весь экран (F)">
        <Cover src={img(track.album?.images, 600)} />
      </button>
      <div className="nc-title">{track.name}</div>
      <div className="nc-artists">
        {track.artists.map((a, i) => <span key={a.id || i}>{i > 0 && ', '}<a onClick={() => a.id && router.go({ name: 'artist', id: a.id })}>{a.name}</a></span>)}
      </div>
      {track.album?.name && (
        <div className="nc-album">
          <a onClick={() => track.album.id && router.go({ name: 'album', id: track.album.id })}>{track.album.name}</a>
          {track.album.release_date && <span className="mono"> · {year(track.album.release_date)}</span>}
        </div>
      )}
      {ctx && <ContextLine uri={ctx} />}
      {queue.length > 0 && (
        <div className="nc-next">
          <div className="section-label">Дальше <button className="link-btn" onClick={() => ui.set({ panel: 'queue' })}>вся очередь</button></div>
          {queue.slice(0, 3).map((t, i) => <QueueItem key={t.uri + i} t={t} skip={i + 1} />)}
        </div>
      )}
    </div>
  );
}

function ContextLine({ uri }: { uri: string }) {
  const { label, go } = contextLabel(uri);
  return (
    <div className="nc-ctx">
      <span className="section-label">Играет из</span>
      <a onClick={go}>{label}</a>
    </div>
  );
}

function QueueList() {
  const { queue, track } = useStore(player, (s) => ({ queue: s.queue, track: s.track }));
  useEffect(() => { refreshQueue(); }, []);
  return (
    <div className="queue">
      {track && (
        <>
          <div className="section-label">Сейчас</div>
          <QueueItem t={track} current />
        </>
      )}
      <div className="section-label">Далее {queue.length > 0 && <span className="mono muted">· {queue.length}</span>}</div>
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
      <Cover src={img(t.album?.images, 64)} size={40} />
      <div className="q-text">
        <div className="q-name">{t.name}</div>
        <div className="q-artist">{t.artists?.map((a) => a.name).join(', ')}</div>
      </div>
      <span className="mono muted q-dur">{fmt(t.duration_ms)}</span>
    </div>
  );
}
