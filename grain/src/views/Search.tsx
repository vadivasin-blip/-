import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/spotify';
import { controls } from '../lib/player';
import { useAsync } from '../lib/useAsync';
import { router, year } from '../lib/ui';
import { img, artistsLine, type Artist, type Track } from '../lib/types';
import { Cover } from '../components/Cover';
import { I } from '../components/icons';
import { MediaCard, Shelf } from '../components/MediaCard';
import { TrackList } from '../components/TrackList';
import { Loading } from '../components/PageHeader';

type Tab = 'all' | 'track' | 'artist' | 'album' | 'playlist';
const TABS: [Tab, string][] = [['all', 'Всё'], ['track', 'Треки'], ['artist', 'Исполнители'], ['album', 'Альбомы'], ['playlist', 'Плейлисты']];
const HISTORY = 'grain.searches';

export function SearchView({ initial }: { initial?: string }) {
  const [q, setQ] = useState(initial ?? '');
  const [debounced, setDebounced] = useState(initial ?? '');
  const [tab, setTab] = useState<Tab>('all');
  const [history, setHistory] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(HISTORY) || '[]'); } catch { return []; } });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 280); return () => clearTimeout(t); }, [q]);
  useEffect(() => { router.replace({ name: 'search', q: debounced }); }, [debounced]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const remember = () => {
    const s = debounced;
    if (s.length < 2) return;
    const next = [s, ...history.filter((h) => h.toLowerCase() !== s.toLowerCase())].slice(0, 12);
    setHistory(next);
    localStorage.setItem(HISTORY, JSON.stringify(next));
  };

  const all = useAsync(debounced ? `s:all:${debounced}` : null, () => api.search(debounced, 'track,artist,album,playlist', 10));
  const deep = useAsync(debounced && tab !== 'all' ? `s:${tab}:${debounced}` : null, async () => {
    const pages = await Promise.all([0, 10, 20, 30, 40].map((o) => api.search(debounced, tab, 10, o).catch(() => null)));
    const key = `${tab}s` as 'tracks';
    const seen = new Set<string>();
    return pages.flatMap((p) => (p?.[key]?.items ?? []) as any[]).filter((x) => x && !seen.has(x.id) && seen.add(x.id));
  });
  const top = useAsync('search:topArtists', () => api.top<Artist>('artists', 'medium_term', 12));

  return (
    <div className="page search" onClickCapture={remember}>
      <label className="search-big">
        <I.search size={20} />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Что хотите послушать?" spellCheck={false}
          onKeyDown={(e) => { if (e.key === 'Enter') remember(); if (e.key === 'Escape') setQ(''); }} />
        {q && <button className="icon-btn xs" onClick={() => { setQ(''); inputRef.current?.focus(); }}><I.close size={15} /></button>}
      </label>

      {!debounced ? (
        <>
          {history.length > 0 && (
            <section className="shelf">
              <div className="shelf-head"><h2>Недавние запросы</h2><button className="link-btn" onClick={() => { setHistory([]); localStorage.removeItem(HISTORY); }}>очистить</button></div>
              <div className="chips">{history.map((h) => <button key={h} className="chip big" onClick={() => setQ(h)}>{h}</button>)}</div>
            </section>
          )}
          {top.data && (
            <Shelf title="Быстрый переход">
              {top.data.items.map((a) => <MediaCard key={a.id} title={a.name} sub="Исполнитель" image={img(a.images, 300)} uri={a.uri} route={{ name: 'artist', id: a.id }} round />)}
            </Shelf>
          )}
        </>
      ) : (
        <>
          <div className="seg tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
          {tab === 'all' ? (!all.data ? <Loading label="Ищу…" /> : <AllResults r={all.data} />) : (
            !deep.data ? <Loading label="Ищу…" /> : <DeepResults tab={tab} items={deep.data} />
          )}
        </>
      )}
    </div>
  );
}

function AllResults({ r }: { r: Awaited<ReturnType<typeof api.search>> }) {
  const tracks = r.tracks?.items ?? [];
  const artists = r.artists?.items ?? [];
  const albums = r.albums?.items ?? [];
  const playlists = r.playlists?.items ?? [];
  const best: { kind: 'artist'; a: Artist } | { kind: 'track'; t: Track } | null = artists[0] ? { kind: 'artist', a: artists[0] } : tracks[0] ? { kind: 'track', t: tracks[0] } : null;
  if (!tracks.length && !artists.length && !albums.length && !playlists.length) return <div className="empty-state">Ничего не нашлось. Попробуйте иначе написать название.</div>;
  return (
    <>
      <div className="search-top">
        {best && (
          <div className="best" onClick={() => best.kind === 'artist' ? router.go({ name: 'artist', id: best.a.id }) : best.t.album?.id && router.go({ name: 'album', id: best.t.album.id })}>
            <div className="section-label">Лучшее совпадение</div>
            <Cover src={best.kind === 'artist' ? img(best.a.images, 300) : img(best.t.album.images, 300)} size={104} round={best.kind === 'artist'} />
            <div className="best-text">
              <div className="best-name">{best.kind === 'artist' ? best.a.name : best.t.name}</div>
              <div className="best-sub">{best.kind === 'artist' ? 'Исполнитель' : `Трек · ${artistsLine(best.t.artists)}`}</div>
            </div>
            <button className="play-btn big" onClick={(e) => { e.stopPropagation(); best.kind === 'artist' ? controls.playContext(best.a.uri) : controls.playUris(tracks.map((t) => t.uri), best.t.uri); }}><I.play size={20} /></button>
          </div>
        )}
        <div className="search-tracks">
          <div className="section-label">Треки</div>
          <TrackList rows={tracks.slice(0, 6).map((t, i) => ({ track: t, key: t.uri + i }))} showAlbum={false} />
        </div>
      </div>
      {artists.length > 0 && <Shelf title="Исполнители">{artists.map((a) => <MediaCard key={a.id} title={a.name} sub="Исполнитель" image={img(a.images, 300)} uri={a.uri} route={{ name: 'artist', id: a.id }} round />)}</Shelf>}
      {albums.length > 0 && <Shelf title="Альбомы">{albums.map((a) => <MediaCard key={a.id} title={a.name} sub={<>{year(a.release_date)} · {artistsLine(a.artists)}</>} image={img(a.images, 300)} uri={a.uri} route={{ name: 'album', id: a.id }} />)}</Shelf>}
      {playlists.length > 0 && <Shelf title="Плейлисты">{playlists.map((p) => <MediaCard key={p.id} title={p.name} sub={`от ${p.owner?.display_name ?? '—'}`} image={img(p.images, 300)} uri={p.uri} route={{ name: 'playlist', id: p.id }} />)}</Shelf>}
    </>
  );
}

function DeepResults({ tab, items }: { tab: Tab; items: any[] }) {
  if (!items.length) return <div className="empty-state">Ничего не нашлось.</div>;
  if (tab === 'track') return <TrackList rows={items.map((t: Track, i) => ({ track: t, key: t.uri + i }))} toolbar />;
  return (
    <div className="grid">
      {items.map((x) => tab === 'artist'
        ? <MediaCard key={x.id} title={x.name} sub="Исполнитель" image={img(x.images, 300)} uri={x.uri} route={{ name: 'artist', id: x.id }} round />
        : tab === 'album'
          ? <MediaCard key={x.id} title={x.name} sub={<>{year(x.release_date)} · {artistsLine(x.artists)}</>} image={img(x.images, 300)} uri={x.uri} route={{ name: 'album', id: x.id }} />
          : <MediaCard key={x.id} title={x.name} sub={`от ${x.owner?.display_name ?? '—'}`} image={img(x.images, 300)} uri={x.uri} route={{ name: 'playlist', id: x.id }} />)}
    </div>
  );
}
