import { useEffect, useState } from 'react';
import { api } from '../lib/spotify';
import { controls, player } from '../lib/player';
import { useStore } from '../lib/store';
import { useAsync } from '../lib/useAsync';
import { copy, openMenu, shareUrl, toast, year } from '../lib/ui';
import { bridge } from '../lib/bridge';
import { img, type Album } from '../lib/types';
import { ErrorBox, Loading, PageHeader } from '../components/PageHeader';
import { TrackList } from '../components/TrackList';
import { MediaCard } from '../components/MediaCard';
import { ActionBar } from './Collection';

const GROUPS: [string, string][] = [['album', 'Альбомы'], ['single', 'Синглы и EP'], ['compilation', 'Сборники'], ['appears_on', 'С участием']];

export function ArtistView({ id }: { id: string }) {
  const ar = useAsync(`ar:${id}`, () => api.artist(id));
  const albums = useAsync(`ar:${id}:disco`, async () => {
    const all: Album[] = [];
    for (let off = 0; off < 200; off += 50) {
      const pg = await api.artistAlbums(id, 'album,single,compilation,appears_on', off);
      all.push(...pg.items.filter(Boolean));
      if (!pg.next) break;
    }
    return all;
  });
  // топ-треки исполнителя в dev-режиме недоступны с 2026 — берём поиск по исполнителю
  const tracks = useAsync(ar.data ? `ar:${id}:tracks` : null, async () => {
    const r = await api.search(`artist:"${ar.data!.name}"`, 'track', 10);
    return (r.tracks?.items ?? []).filter((t) => t.artists.some((a) => a.id === id));
  });
  const [tab, setTab] = useState('album');
  const [following, setFollowing] = useState<boolean | null>(null);
  const [showAll, setShowAll] = useState(false);
  const ctx = useStore(player, (s) => s.contextUri);
  const playing = useStore(player, (s) => s.playing);

  useEffect(() => { setFollowing(null); setShowAll(false); api.contains([`spotify:artist:${id}`]).then(([v]) => setFollowing(!!v)).catch(() => {}); }, [id]);
  useEffect(() => {
    if (!albums.data) return;
    const first = GROUPS.find(([g]) => albums.data!.some((a) => groupOf(a) === g));
    if (first) setTab(first[0]);
  }, [albums.data]);

  if (ar.error) return <ErrorBox error={ar.error} retry={ar.reload} />;
  if (!ar.data) return <Loading />;
  const a = ar.data;
  const isCur = ctx === a.uri;
  const list = (albums.data ?? []).filter((x) => groupOf(x) === tab);
  const rows = (tracks.data ?? []).map((t, i) => ({ track: t, key: t.uri + i }));

  const toggleFollow = async () => {
    const want = !following;
    setFollowing(want);
    try { await (want ? api.save([a.uri]) : api.unsave([a.uri])); toast(want ? `Вы подписаны на ${a.name}` : 'Подписка отменена'); }
    catch (e) { setFollowing(!want); toast(`Не удалось: ${(e as Error).message}`); }
  };

  return (
    <div className="page">
      <PageHeader image={img(a.images, 640)} round kind="Исполнитель" title={a.name}
        meta={a.genres?.length ? <span>{a.genres.slice(0, 3).join(' · ')}</span> : undefined} />
      <ActionBar playing={isCur && playing} onPlay={() => (isCur ? controls.toggle() : controls.playContext(a.uri))}
        onShuffle={async () => { if (!player.get().shuffle) await controls.toggleShuffle(); controls.playContext(a.uri); }}
        extra={following !== null && <button className={`btn ${following ? '' : 'ghost'}`} onClick={toggleFollow}>{following ? 'Вы подписаны' : 'Подписаться'}</button>}
        menu={(e) => openMenu(e, [
          { label: 'Скопировать ссылку', run: () => copy(shareUrl(a.uri)) },
          { label: 'Открыть в Spotify', run: () => bridge.openExternal(shareUrl(a.uri)) },
        ])} />

      {rows.length > 0 && (
        <section className="shelf">
          <div className="shelf-head"><h2>Треки</h2>{rows.length > 5 && <button className="link-btn" onClick={() => setShowAll(!showAll)}>{showAll ? 'свернуть' : 'показать все'}</button>}</div>
          <TrackList rows={showAll ? rows : rows.slice(0, 5)} showAlbum />
        </section>
      )}

      <section className="shelf">
        <div className="shelf-head">
          <h2>Дискография</h2>
          <div className="seg">
            {GROUPS.filter(([g]) => (albums.data ?? []).some((x) => groupOf(x) === g)).map(([g, l]) => (
              <button key={g} className={tab === g ? 'on' : ''} onClick={() => setTab(g)}>{l}</button>
            ))}
          </div>
        </div>
        {!albums.data ? <Loading /> : (
          <div className="grid">
            {list.map((x) => (
              <MediaCard key={x.id} title={x.name} image={img(x.images, 300)} uri={x.uri} route={{ name: 'album', id: x.id }}
                sub={<span className="mono">{year(x.release_date)}{tab === 'appears_on' ? ` · ${x.artists?.[0]?.name}` : ''}</span>} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const groupOf = (a: Album & { album_group?: string }) => a.album_group ?? (a.album_type === 'single' ? 'single' : a.album_type === 'compilation' ? 'compilation' : 'album');
