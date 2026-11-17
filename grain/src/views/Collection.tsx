import { useEffect, useMemo, useState } from 'react';
import { api, pageAll } from '../lib/spotify';
import { isOwn, libraryStore, reloadPlaylists } from '../lib/library';
import { controls, player } from '../lib/player';
import { useStore } from '../lib/store';
import { useAsync } from '../lib/useAsync';
import { copy, fmtLong, openMenu, plural, shareUrl, toast } from '../lib/ui';
import { bridge } from '../lib/bridge';
import { img, playlistTotal, type Row } from '../lib/types';
import { ErrorBox, Loading, PageHeader } from '../components/PageHeader';
import { TrackList } from '../components/TrackList';
import { I } from '../components/icons';

/** Постепенная загрузка всех строк: первая страница сразу, остальное — фоном. */
function useRows(key: string, fetchPage: (offset: number) => Promise<{ items: Row[]; total: number; next: string | null; offset: number; limit: number }>) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const cached = useAsync(`${key}:rows:${nonce}`, () => pageAll(fetchPage, 5000, (items) => { setRows(items); }));
  useEffect(() => { setRows(null); setDone(false); setError(null); }, [key]);
  useEffect(() => { if (cached.data) { setRows(cached.data); setDone(true); } }, [cached.data]);
  useEffect(() => { if (cached.error) setError(cached.error); }, [cached.error]);
  return { rows, done, error, remove: (uri: string) => setRows((r) => r?.filter((x) => x.track.uri !== uri) ?? null), reload: () => setNonce((n) => n + 1) };
}

export function PlaylistView({ id }: { id: string }) {
  const pl = useAsync(`pl:${id}`, () => api.playlist(id));
  const { rows, done, error, remove } = useRows(`pl:${id}`, (o) => api.playlistRows(id, o));
  const me = useStore(libraryStore, (s) => s.me);
  const followed = useStore(libraryStore, (s) => s.playlists.some((p) => p.id === id));
  const ctx = useStore(player, (s) => s.contextUri);
  const playing = useStore(player, (s) => s.playing);
  const total = useMemo(() => rows?.reduce((s, r) => s + (r.track.duration_ms || 0), 0) ?? 0, [rows]);

  if (pl.error) return <ErrorBox error={pl.error} retry={pl.reload} />;
  if (!pl.data) return <Loading />;
  const p = pl.data;
  const own = isOwn(p);
  const isCur = ctx === p.uri;

  const follow = async () => {
    try {
      await (followed ? api.unsave([p.uri]) : api.save([p.uri]));
      await reloadPlaylists();
      toast(followed ? 'Плейлист убран из медиатеки' : 'Плейлист добавлен в медиатеку');
    } catch (e) { toast(`Не удалось: ${(e as Error).message}`); }
  };

  return (
    <div className="page">
      <PageHeader image={img(p.images, 640)} kind={p.public === false ? 'Закрытый плейлист' : 'Плейлист'} title={p.name} desc={p.description}
        meta={<>
          <b>{p.owner?.display_name ?? p.owner?.id}</b>
          <span>{plural(playlistTotal(p) || rows?.length || 0, 'трек', 'трека', 'треков')}</span>
          {done && total > 0 && <span>{fmtLong(total)}</span>}
        </>} />
      <ActionBar
        playing={isCur && playing}
        onPlay={() => (isCur ? controls.toggle() : controls.playContext(p.uri))}
        onShuffle={async () => { if (!player.get().shuffle) await controls.toggleShuffle(); controls.playContext(p.uri); }}
        extra={!own && p.owner?.id !== me?.id && (
          <button className={`icon-btn big like ${followed ? 'on' : ''}`} onClick={follow} title={followed ? 'Убрать из медиатеки' : 'Добавить в медиатеку'}>
            {followed ? <I.heartFill size={22} /> : <I.heart size={22} />}
          </button>
        )}
        menu={(e) => openMenu(e, [
          { label: 'Скопировать ссылку', run: () => copy(shareUrl(p.uri)) },
          { label: 'Открыть в Spotify', run: () => bridge.openExternal(shareUrl(p.uri)) },
          ...(rows ? [{ label: 'Добавить всё в очередь (первые 30)', run: async () => { for (const r of rows.slice(0, 30)) await api.enqueue(r.track.uri).catch(() => {}); toast('Добавлено в очередь'); } }] : []),
        ])}
      />
      {error && <ErrorBox error={error} />}
      {!rows ? <Loading label="Загружаю треки…" /> : (
        <TrackList rows={rows} contextUri={p.uri} showAdded toolbar loadingMore={!done}
          ctx={{ playlistId: p.id, own, onRemoved: remove }} empty="В плейлисте пока нет треков" />
      )}
    </div>
  );
}

export function LikedView() {
  const me = useStore(libraryStore, (s) => s.me);
  const { rows, done, error } = useRows('liked', (o) => api.savedRows(o));
  const ctx = useStore(player, (s) => s.contextUri);
  const playing = useStore(player, (s) => s.playing);
  const uri = me ? `spotify:user:${me.id}:collection` : '';
  const total = useMemo(() => rows?.reduce((s, r) => s + (r.track.duration_ms || 0), 0) ?? 0, [rows]);
  const isCur = !!ctx?.endsWith(':collection');
  return (
    <div className="page">
      <header className="page-head liked-head">
        <span className="ph-cover liked-tile huge"><I.heartFill size={64} /></span>
        <div className="ph-text">
          <div className="ph-kind">Коллекция</div>
          <h1>Любимые треки</h1>
          <div className="ph-meta">
            <b>{me?.display_name}</b>
            {rows && <span>{plural(rows.length, 'трек', 'трека', 'треков')}{!done && '…'}</span>}
            {done && <span>{fmtLong(total)}</span>}
          </div>
        </div>
      </header>
      <ActionBar playing={isCur && playing}
        onPlay={() => (isCur ? controls.toggle() : uri && controls.playContext(uri))}
        onShuffle={async () => { if (!player.get().shuffle) await controls.toggleShuffle(); uri && controls.playContext(uri); }} />
      {error && <ErrorBox error={error} />}
      {!rows ? <Loading label="Загружаю любимые…" /> : (
        <TrackList rows={rows} contextUri={uri} showAdded toolbar allLiked loadingMore={!done} empty="Отмечайте треки сердечком — они появятся здесь" />
      )}
    </div>
  );
}

export function ActionBar({ playing, onPlay, onShuffle, extra, menu }: {
  playing: boolean; onPlay: () => void; onShuffle?: () => void; extra?: React.ReactNode; menu?: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="actionbar">
      <button className="play-btn big" onClick={onPlay} title={playing ? 'Пауза' : 'Играть'}>{playing ? <I.pause size={22} /> : <I.play size={22} />}</button>
      {onShuffle && <button className="btn ghost" onClick={onShuffle}><I.shuffle size={16} /> Вперемешку</button>}
      {extra}
      {menu && <button className="icon-btn big" onClick={menu} title="Ещё"><I.more size={22} /></button>}
    </div>
  );
}
