import { useMemo } from 'react';
import { api } from '../lib/spotify';
import { libraryStore } from '../lib/library';
import { controls, player } from '../lib/player';
import { useStore } from '../lib/store';
import { useAsync } from '../lib/useAsync';
import { router, plural } from '../lib/ui';
import { img, artistsLine, playlistTotal, type Artist, type Track } from '../lib/types';
import { Cover } from '../components/Cover';
import { Bars, I } from '../components/icons';
import { MediaCard, Shelf } from '../components/MediaCard';
import { TrackList } from '../components/TrackList';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

type Recent = { uri: string; kind: string; id: string; title: string; image?: string; sub: string };

export function Home() {
  const { me, playlists } = useStore(libraryStore, (s) => ({ me: s.me, playlists: s.playlists }));
  const recent = useAsync('home:recent', () => api.recent(50));
  const topArtists = useAsync('home:topArtists', () => api.top<Artist>('artists', 'short_term', 12));
  const topTracks = useAsync('home:topTracks', () => api.top<Track>('tracks', 'short_term', 10));
  const ctx = useStore(player, (s) => s.contextUri);
  const playing = useStore(player, (s) => s.playing);

  const recents = useMemo<Recent[]>(() => {
    const seen = new Set<string>();
    const out: Recent[] = [];
    for (const it of recent.data?.items ?? []) {
      const c = it.context;
      let r: Recent | null = null;
      if (c?.type === 'playlist') {
        const id = c.uri.split(':').pop()!;
        const pl = playlists.find((p) => p.id === id);
        r = { uri: c.uri, kind: 'playlist', id, title: pl?.name ?? 'Плейлист', image: img(pl?.images, 300) ?? img(it.track.album.images, 300), sub: pl ? plural(playlistTotal(pl), 'трек', 'трека', 'треков') : 'Плейлист' };
      } else if (c?.type === 'artist') {
        const a = it.track.artists[0];
        r = { uri: c.uri, kind: 'artist', id: c.uri.split(':').pop()!, title: a?.name ?? 'Исполнитель', image: img(it.track.album.images, 300), sub: 'Исполнитель' };
      } else if (c?.type === 'collection' || c?.uri?.endsWith(':collection')) {
        r = { uri: c.uri, kind: 'liked', id: '', title: 'Любимые треки', sub: 'Ваша коллекция' };
      } else {
        const al = it.track.album;
        r = { uri: al.uri, kind: 'album', id: al.id, title: al.name, image: img(al.images, 300), sub: artistsLine(it.track.artists) };
      }
      if (r && !seen.has(r.uri)) { seen.add(r.uri); out.push(r); }
    }
    return out;
  }, [recent.data, playlists]);

  const quick = recents.slice(0, 8);
  const go = (r: Recent) => {
    if (r.kind === 'liked') router.go({ name: 'liked' });
    else router.go({ name: r.kind as 'album', id: r.id });
  };

  return (
    <div className="page home">
      <h1 className="home-hello">{greeting()}{me?.display_name ? `, ${me.display_name.split(' ')[0]}` : ''}</h1>

      {quick.length > 0 && (
        <div className="quick">
          {quick.map((r) => (
            <div key={r.uri} className={`quick-tile ${ctx === r.uri ? 'current' : ''}`} onClick={() => go(r)}>
              {r.kind === 'liked' ? <span className="liked-tile big"><I.heartFill size={20} /></span> : <Cover src={r.image} size={56} round={r.kind === 'artist'} />}
              <span className="qt-name">{r.title}</span>
              {ctx === r.uri ? <span className="qt-eq"><Bars playing={playing} /></span> : (
                <button className="qt-play" onClick={(e) => { e.stopPropagation(); controls.playContext(r.uri); }} aria-label="Играть"><I.play size={15} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {topTracks.data && topTracks.data.items.length > 0 && (
        <section className="shelf">
          <div className="shelf-head">
            <h2>На повторе этого месяца</h2>
            <button className="link-btn" onClick={() => router.go({ name: 'stats' })}>вся статистика</button>
          </div>
          <TrackList rows={topTracks.data.items.slice(0, 5).map((t, i) => ({ track: t, key: t.uri + i }))} showAlbum />
        </section>
      )}

      {recents.length > 8 && (
        <Shelf title="Недавно слушали">
          {recents.slice(8, 20).filter((r) => r.kind !== 'liked').map((r) => (
            <MediaCard key={r.uri} title={r.title} sub={r.sub} image={r.image} uri={r.uri} route={{ name: r.kind as 'album', id: r.id }} round={r.kind === 'artist'} />
          ))}
        </Shelf>
      )}

      {topArtists.data && topArtists.data.items.length > 0 && (
        <Shelf title="Ваши исполнители сейчас">
          {topArtists.data.items.slice(0, 12).map((a) => (
            <MediaCard key={a.id} title={a.name} sub="Исполнитель" image={img(a.images, 300)} uri={a.uri} route={{ name: 'artist', id: a.id }} round />
          ))}
        </Shelf>
      )}

      {playlists.length > 0 && (
        <Shelf title="Ваши плейлисты" action={<button className="link-btn" onClick={() => router.go({ name: 'library' })}>все</button>}>
          {playlists.slice(0, 12).map((p) => (
            <MediaCard key={p.id} title={p.name} sub={p.owner?.id === me?.id ? plural(playlistTotal(p), 'трек', 'трека', 'треков') : `от ${p.owner?.display_name}`}
              image={img(p.images, 300)} uri={p.uri} route={{ name: 'playlist', id: p.id }} />
          ))}
        </Shelf>
      )}
    </div>
  );
}
