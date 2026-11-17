import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/spotify';
import { controls, player } from '../lib/player';
import { useStore } from '../lib/store';
import { useAsync } from '../lib/useAsync';
import { copy, fmtLong, openMenu, plural, router, shareUrl, toast, year } from '../lib/ui';
import { bridge } from '../lib/bridge';
import { img, type Row, type Track } from '../lib/types';
import { ErrorBox, Loading, PageHeader } from '../components/PageHeader';
import { TrackList } from '../components/TrackList';
import { MediaCard, Shelf } from '../components/MediaCard';
import { ActionBar } from './Collection';
import { I } from '../components/icons';

const KIND: Record<string, string> = { album: 'Альбом', single: 'Сингл', compilation: 'Сборник', ep: 'EP' };

export function AlbumView({ id }: { id: string }) {
  const q = useAsync(`al:${id}`, async () => {
    const al = await api.album(id);
    let tracks = al.tracks?.items ?? [];
    let next = al.tracks?.next;
    while (next && tracks.length < 500) {
      const pg = await api.albumTracks(id, tracks.length);
      tracks = tracks.concat(pg.items);
      next = pg.next;
    }
    return { ...al, all: tracks };
  });
  const [saved, setSaved] = useState<boolean | null>(null);
  const ctx = useStore(player, (s) => s.contextUri);
  const playing = useStore(player, (s) => s.playing);
  const artistId = q.data?.artists?.[0]?.id;
  const more = useAsync(artistId ? `ar:${artistId}:albums` : null, () => api.artistAlbums(artistId!));

  useEffect(() => { setSaved(null); api.contains([`spotify:album:${id}`]).then(([v]) => setSaved(!!v)).catch(() => {}); }, [id]);

  const rows = useMemo<Row[]>(() => {
    const al = q.data;
    if (!al) return [];
    const ref = { id: al.id, name: al.name, uri: al.uri, images: al.images, release_date: al.release_date };
    return al.all.map((t, i) => ({ track: { ...t, album: ref } as Track, key: `${t.uri}#${i}` }));
  }, [q.data]);

  if (q.error) return <ErrorBox error={q.error} retry={q.reload} />;
  if (!q.data) return <Loading />;
  const al = q.data;
  const total = rows.reduce((s, r) => s + r.track.duration_ms, 0);
  const isCur = ctx === al.uri;
  const multiDisc = rows.some((r) => (r.track.disc_number ?? 1) > 1);

  const toggleSave = async () => {
    const want = !saved;
    setSaved(want);
    try { await (want ? api.save([al.uri]) : api.unsave([al.uri])); toast(want ? 'Альбом в медиатеке' : 'Альбом убран из медиатеки'); }
    catch (e) { setSaved(!want); toast(`Не удалось: ${(e as Error).message}`); }
  };

  return (
    <div className="page">
      <PageHeader image={img(al.images, 640)} kind={KIND[al.album_type ?? 'album'] ?? 'Альбом'} title={al.name}
        meta={<>
          {al.artists.map((a, i) => <b key={a.id}>{i > 0 && ', '}<a onClick={() => router.go({ name: 'artist', id: a.id })}>{a.name}</a></b>)}
          <span className="mono">{year(al.release_date)}</span>
          <span>{plural(rows.length, 'трек', 'трека', 'треков')}</span>
          <span>{fmtLong(total)}</span>
        </>} />
      <ActionBar playing={isCur && playing}
        onPlay={() => (isCur ? controls.toggle() : controls.playContext(al.uri))}
        extra={saved !== null && (
          <button className={`icon-btn big like ${saved ? 'on' : ''}`} onClick={toggleSave} title={saved ? 'Убрать из медиатеки' : 'Сохранить альбом'}>
            {saved ? <I.heartFill size={22} /> : <I.heart size={22} />}
          </button>
        )}
        menu={(e) => openMenu(e, [
          { label: 'Скопировать ссылку', run: () => copy(shareUrl(al.uri)) },
          { label: 'Открыть в Spotify', run: () => bridge.openExternal(shareUrl(al.uri)) },
        ])} />
      <TrackList rows={rows} contextUri={al.uri} showAlbum={false} showCover={false} albumMode toolbar={rows.length > 25} />
      {multiDisc && <div className="hint">В альбоме несколько дисков — треки идут подряд.</div>}
      <div className="album-foot">
        <div>{new Date(al.release_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        {al.label && <div>{al.label}</div>}
        {al.copyrights?.slice(0, 2).map((c, i) => <div key={i}>{c.text}</div>)}
      </div>
      {more.data && more.data.items.filter((a) => a.id !== al.id).length > 0 && (
        <Shelf title={`Ещё от ${al.artists[0].name}`} action={<button className="link-btn" onClick={() => router.go({ name: 'artist', id: al.artists[0].id })}>дискография</button>}>
          {more.data.items.filter((a) => a.id !== al.id).slice(0, 8).map((a) => (
            <MediaCard key={a.id} title={a.name} sub={<span className="mono">{year(a.release_date)} · {KIND[a.album_type ?? 'album']}</span>} image={img(a.images, 300)} uri={a.uri} route={{ name: 'album', id: a.id }} />
          ))}
        </Shelf>
      )}
    </div>
  );
}
