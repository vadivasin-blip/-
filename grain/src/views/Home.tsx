import { useMemo } from 'react';
import { api } from '../lib/spotify';
import { libraryStore } from '../lib/library';
import { controls, player } from '../lib/player';
import { useStore } from '../lib/store';
import { useAsync } from '../lib/useAsync';
import { router, plural } from '../lib/ui';
import { img, artistsLine, playlistTotal, type Artist, type Track } from '../lib/types';
import { I } from '../components/icons';
import { Vinyl } from '../components/Vinyl';
import { LikedSleeve } from './Collection';
import { useTheme } from '../lib/season';
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

  const winter = useTheme() === 'winter';
  const xmas = useAsync(winter ? 'home:xmas' : null, async () => {
    const r = await api.search('новогодние песни', 'playlist', 10);
    return (r.playlists?.items ?? []).filter((p) => p && p.images?.length);
  });
  const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page home">
      <div className="hero">
        <div className="kicker">{today}</div>
        <h1 className="home-hello">{greeting()}{me?.display_name ? <>,<br />{me.display_name.split(' ')[0]}</> : ''}</h1>
      </div>

      {recents.length > 0 && (
        <section className="shelf">
          <div className="shelf-head"><div><div className="kicker">с проигрывателя</div><h2>Недавние пластинки</h2></div></div>
          <div className="crate">
            {recents.slice(0, 10).map((r) => r.kind === 'liked' ? (
              <div key={r.uri} className={`card sleeve-card ${ctx === r.uri ? 'current' : ''}`} onClick={() => router.go({ name: 'liked' })}>
                <div className="sleeve"><Vinyl spinning={ctx === r.uri && playing} className="sleeve-vinyl" /><div className="sleeve-cover"><LikedSleeve /></div>
                  <button className="card-play" onClick={(e) => { e.stopPropagation(); controls.playContext(r.uri); }} aria-label="Играть"><I.play size={16} /></button></div>
                <div className="card-title">{r.title}</div><div className="card-sub">{r.sub}</div>
              </div>
            ) : (
              <MediaCard key={r.uri} title={r.title} sub={r.sub} image={r.image} uri={r.uri} route={{ name: r.kind as 'album', id: r.id }} round={r.kind === 'artist'} />
            ))}
          </div>
        </section>
      )}

      {winter && xmas.data && xmas.data.length > 0 && (
        <Shelf kicker="сезонное" title="Под ёлку">
          {xmas.data.slice(0, 6).map((p) => (
            <MediaCard key={p.id} title={p.name} sub={`от ${p.owner?.display_name ?? '—'}`} image={img(p.images, 300)} uri={p.uri} route={{ name: 'playlist', id: p.id }} />
          ))}
        </Shelf>
      )}

      {topTracks.data && topTracks.data.items.length > 0 && (
        <section className="shelf">
          <div className="shelf-head">
            <div><div className="kicker">последние 4 недели</div><h2>На повторе</h2></div>
            <button className="link-btn" onClick={() => router.go({ name: 'stats' })}>все итоги →</button>
          </div>
          <TrackList rows={topTracks.data.items.slice(0, 6).map((t, i) => ({ track: t, key: t.uri + i }))} showAlbum />
        </section>
      )}

      {topArtists.data && topArtists.data.items.length > 0 && (
        <Shelf kicker="крутятся чаще всего" title="Ваши исполнители">
          {topArtists.data.items.slice(0, 12).map((a) => (
            <MediaCard key={a.id} title={a.name} sub="Исполнитель" image={img(a.images, 300)} uri={a.uri} route={{ name: 'artist', id: a.id }} round />
          ))}
        </Shelf>
      )}

      {playlists.length > 0 && (
        <Shelf kicker="ваша полка" title="Плейлисты" action={<button className="link-btn" onClick={() => router.go({ name: 'library' })}>вся полка →</button>}>
          {playlists.slice(0, 12).map((p) => (
            <MediaCard key={p.id} title={p.name} sub={p.owner?.id === me?.id ? plural(playlistTotal(p), 'трек', 'трека', 'треков') : `от ${p.owner?.display_name}`}
              image={img(p.images, 300)} uri={p.uri} route={{ name: 'playlist', id: p.id }} />
          ))}
        </Shelf>
      )}
    </div>
  );
}
