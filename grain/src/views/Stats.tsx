import { useMemo, useState } from 'react';
import { api } from '../lib/spotify';
import { controls } from '../lib/player';
import { useAsync } from '../lib/useAsync';
import { fmtLong, router } from '../lib/ui';
import { img, artistsLine, type Artist, type Track } from '../lib/types';
import { Cover } from '../components/Cover';
import { Loading } from '../components/PageHeader';
import { TrackList } from '../components/TrackList';
import { I } from '../components/icons';

type Range = 'short_term' | 'medium_term' | 'long_term';
const RANGES: [Range, string][] = [['short_term', '4 недели'], ['medium_term', '6 месяцев'], ['long_term', 'Всё время']];

export function StatsView() {
  const [range, setRange] = useState<Range>('short_term');
  const tracks = useAsync(`stats:t:${range}`, () => api.top<Track>('tracks', range, 50));
  const artists = useAsync(`stats:a:${range}`, () => api.top<Artist>('artists', range, 30));
  const recent = useAsync('stats:recent', () => api.recent(50));
  const [showTracks, setShowTracks] = useState(20);

  const genres = useMemo(() => {
    const m = new Map<string, number>();
    (artists.data?.items ?? []).forEach((a, i) => (a.genres ?? []).forEach((g) => m.set(g, (m.get(g) ?? 0) + (30 - i))));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [artists.data]);
  const maxG = genres[0]?.[1] ?? 1;

  const decade = useMemo(() => {
    const m = new Map<string, number>();
    (tracks.data?.items ?? []).forEach((t) => {
      const y = Number(t.album?.release_date?.slice(0, 4));
      if (y) { const d = `${Math.floor(y / 10) * 10}-е`; m.set(d, (m.get(d) ?? 0) + 1); }
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tracks.data]);
  const maxD = Math.max(1, ...decade.map(([, n]) => n));

  const recentMs = (recent.data?.items ?? []).reduce((s, it) => s + it.track.duration_ms, 0);
  const tList = tracks.data?.items ?? [];

  return (
    <div className="page stats">
      <div className="lib-head">
        <div><div className="kicker">что крутилось</div><h1 className="page-title">Итоги</h1></div>
        <div className="seg">{RANGES.map(([k, l]) => <button key={k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{l}</button>)}</div>
        <div className="grow" />
        {tList.length > 0 && <button className="btn ghost" onClick={() => controls.playUris(tList.map((t) => t.uri))}><I.play size={14} /> Играть топ-50</button>}
      </div>

      {!artists.data ? <Loading /> : (
        <section className="shelf">
          <div className="shelf-head"><h2>Исполнители</h2></div>
          <div className="podium">
            {artists.data.items.slice(0, 3).map((a, i) => (
              <div key={a.id} className={`pod pod-${i + 1}`} onClick={() => router.go({ name: 'artist', id: a.id })}>
                <span className="pod-rank mono">{i + 1}</span>
                <Cover src={img(a.images, 300)} round />
                <div className="pod-name">{a.name}</div>
              </div>
            ))}
          </div>
          <ol className="rank-list" start={4}>
            {artists.data.items.slice(3, 20).map((a, i) => (
              <li key={a.id} onClick={() => router.go({ name: 'artist', id: a.id })}>
                <span className="mono rank">{i + 4}</span><Cover src={img(a.images, 64)} size={32} round /><span>{a.name}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="stats-cols">
        {genres.length > 0 && (
          <section className="stat-card">
            <div className="section-label">Жанры</div>
            {genres.map(([g, n]) => (
              <div key={g} className="bar-row"><span className="bar-label">{g}</span><span className="bar"><i style={{ width: `${(n / maxG) * 100}%` }} /></span></div>
            ))}
          </section>
        )}
        {decade.length > 0 && (
          <section className="stat-card">
            <div className="section-label">Десятилетия в топ-50</div>
            <div className="decades">
              {decade.map(([d, n]) => (
                <div key={d} className="dec"><span className="dec-bar"><i style={{ height: `${(n / maxD) * 100}%` }} /></span><span className="mono">{d}</span><b className="mono">{n}</b></div>
              ))}
            </div>
          </section>
        )}
        {recent.data && (
          <section className="stat-card">
            <div className="section-label">Последние 50 прослушиваний</div>
            <div className="big-num">{fmtLong(recentMs)}</div>
            <div className="muted">музыки, {new Set(recent.data.items.map((i) => i.track.artists[0]?.id)).size} разных исполнителей</div>
            <div className="recent-strip">
              {recent.data.items.slice(0, 12).map((it, i) => <Cover key={i} src={img(it.track.album.images, 64)} size={34} />)}
            </div>
          </section>
        )}
      </div>

      <section className="shelf">
        <div className="shelf-head"><h2>Треки</h2></div>
        {!tracks.data ? <Loading /> : (
          <>
            <TrackList rows={tList.slice(0, showTracks).map((t, i) => ({ track: t, key: t.uri + i }))} />
            {tList.length > showTracks && <button className="btn ghost center" onClick={() => setShowTracks(50)}>Показать все 50</button>}
          </>
        )}
      </section>

      {recent.data && (
        <section className="shelf">
          <div className="shelf-head"><h2>Недавно играло</h2></div>
          <div className="recent-list">
            {recent.data.items.slice(0, 20).map((it, i) => (
              <div key={i} className="recent-row" onDoubleClick={() => controls.playUris([it.track.uri])}>
                <span className="mono muted when">{new Date(it.played_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                <Cover src={img(it.track.album.images, 64)} size={32} />
                <span className="grow"><b>{it.track.name}</b> <span className="muted">— {artistsLine(it.track.artists)}</span></span>
                <span className="muted small">{new Date(it.played_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
