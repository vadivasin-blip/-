import { useMemo, useState } from 'react';
import { api, pageAll } from '../lib/spotify';
import { libraryStore } from '../lib/library';
import { useStore } from '../lib/store';
import { useAsync } from '../lib/useAsync';
import { plural, router, year } from '../lib/ui';
import { img, artistsLine, playlistTotal, type Artist } from '../lib/types';
import { MediaCard } from '../components/MediaCard';
import { Loading } from '../components/PageHeader';
import { I } from '../components/icons';
import { createPlaylistFlow } from '../components/AddToPlaylist';
import { Vinyl } from '../components/Vinyl';
import { LikedSleeve } from './Collection';

type Tab = 'playlists' | 'albums' | 'artists';

export function LibraryView({ tab: initial }: { tab?: string }) {
  const [tab, setTab] = useState<Tab>((initial as Tab) || 'playlists');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'recent' | 'alpha'>('recent');
  const { playlists, me } = useStore(libraryStore, (s) => ({ playlists: s.playlists, me: s.me }));
  const albums = useAsync(tab === 'albums' ? 'lib:albums' : null, () => pageAll((o) => api.savedAlbums(o), 2000));
  const artists = useAsync(tab === 'artists' ? 'lib:artists' : null, async () => {
    const out: Artist[] = [];
    let after: string | undefined;
    for (let i = 0; i < 40; i++) {
      const r = await api.followedArtists(after);
      out.push(...r.artists.items);
      after = r.artists.cursors?.after;
      if (!after || !r.artists.next) break;
    }
    return out;
  });

  const s = q.trim().toLowerCase();
  const by = <T,>(list: T[], name: (x: T) => string) => {
    const f = s ? list.filter((x) => name(x).toLowerCase().includes(s)) : list;
    return sort === 'alpha' ? [...f].sort((a, b) => name(a).localeCompare(name(b), 'ru')) : f;
  };
  const pl = useMemo(() => by(playlists, (p) => p.name), [playlists, s, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <div className="lib-head">
        <div><div className="kicker">ваша коллекция</div><h1 className="page-title">Полка</h1></div>
        <div className="seg">
          {([['playlists', 'Плейлисты'], ['albums', 'Альбомы'], ['artists', 'Исполнители']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); router.replace({ name: 'library', tab: k }); }}>{l}</button>
          ))}
        </div>
        <div className="grow" />
        <label className="tl-filter">
          <I.filter size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Фильтр" spellCheck={false} />
        </label>
        <div className="seg small">
          <button className={sort === 'recent' ? 'on' : ''} onClick={() => setSort('recent')}>Недавние</button>
          <button className={sort === 'alpha' ? 'on' : ''} onClick={() => setSort('alpha')}>А–Я</button>
        </div>
      </div>

      {tab === 'playlists' && (
        <div className="grid">
          <div className="card new-card" onClick={createPlaylistFlow}>
            <div className="sleeve"><div className="sleeve-cover"><span className="cover"><I.plus size={34} /></span></div></div>
            <div className="card-title">Новый плейлист</div>
            <div className="card-sub">Пустой, закрытый</div>
          </div>
          <div className="card sleeve-card" onClick={() => router.go({ name: 'liked' })}>
            <div className="sleeve"><Vinyl spinning={false} className="sleeve-vinyl" /><div className="sleeve-cover"><LikedSleeve /></div></div>
            <div className="card-title">Любимые треки</div>
            <div className="card-sub">Коллекция</div>
          </div>
          {pl.map((p) => (
            <MediaCard key={p.id} title={p.name} image={img(p.images, 300)} uri={p.uri} route={{ name: 'playlist', id: p.id }}
              sub={p.owner?.id === me?.id ? plural(playlistTotal(p), 'трек', 'трека', 'треков') : `от ${p.owner?.display_name}`} />
          ))}
        </div>
      )}
      {tab === 'albums' && (!albums.data ? <Loading /> : (
        <div className="grid">
          {by(albums.data, (x) => x.album.name).map(({ album: a }) => (
            <MediaCard key={a.id} title={a.name} sub={<>{year(a.release_date)} · {artistsLine(a.artists)}</>} image={img(a.images, 300)} uri={a.uri} route={{ name: 'album', id: a.id }} />
          ))}
          {!albums.data.length && <div className="empty-state">Сохранённых альбомов нет.</div>}
        </div>
      ))}
      {tab === 'artists' && (!artists.data ? <Loading /> : (
        <div className="grid">
          {by(artists.data, (x) => x.name).map((a) => (
            <MediaCard key={a.id} title={a.name} sub="Исполнитель" image={img(a.images, 300)} uri={a.uri} route={{ name: 'artist', id: a.id }} round />
          ))}
          {!artists.data.length && <div className="empty-state">Вы пока ни на кого не подписаны.</div>}
        </div>
      ))}
    </div>
  );
}
