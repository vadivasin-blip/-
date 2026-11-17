import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
import { controls, likeStore, likes, player } from '../lib/player';
import { useStore } from '../lib/store';
import { dateAdded, fmt, router } from '../lib/ui';
import { settings } from '../lib/settings';
import type { Row, Track } from '../lib/types';
import { Cover } from './Cover';
import { Bars, I } from './icons';
import { showTrackMenu, type TrackCtx } from './trackMenu';
import { img } from '../lib/types';

export type SortKey = 'default' | 'title' | 'artist' | 'album' | 'added' | 'duration';
const SORTS: [SortKey, string][] = [
  ['default', 'Свой порядок'], ['title', 'Название'], ['artist', 'Исполнитель'], ['album', 'Альбом'], ['added', 'Дата добавления'], ['duration', 'Длительность'],
];

type Props = {
  rows: Row[];
  contextUri?: string;
  showAlbum?: boolean;
  showAdded?: boolean;
  showCover?: boolean;
  albumMode?: boolean;
  toolbar?: boolean;
  ctx?: TrackCtx;
  allLiked?: boolean;
  loadingMore?: boolean;
  empty?: React.ReactNode;
};

export function TrackList({ rows, contextUri, showAlbum = true, showAdded = false, showCover = true, albumMode, toolbar, ctx, allLiked, loadingMore, empty }: Props) {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('default');
  const [desc, setDesc] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const compact = useStore(settings, (s) => s.compactRows);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (allLiked) likes.setMany(rows.map((r) => r.track.uri), true); }, [allLiked, rows]);

  // Ctrl+F — фильтр по списку
  useEffect(() => {
    if (!toolbar) return;
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); filterRef.current?.focus(); filterRef.current?.select(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [toolbar]);

  const view = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = q
      ? rows.filter(({ track: t }) => `${t.name} ${t.artists.map((a) => a.name).join(' ')} ${t.album?.name ?? ''}`.toLowerCase().includes(q))
      : rows;
    if (sort !== 'default') {
      const key = (r: Row): string | number => {
        const t = r.track;
        switch (sort) {
          case 'title': return t.name.toLowerCase();
          case 'artist': return (t.artists[0]?.name ?? '').toLowerCase() + (t.album?.name ?? '');
          case 'album': return (t.album?.name ?? '').toLowerCase() + String(t.track_number ?? 0).padStart(3, '0');
          case 'added': return r.added_at ?? '';
          case 'duration': return t.duration_ms;
          default: return 0;
        }
      };
      list = [...list].sort((a, b) => {
        const ka = key(a), kb = key(b);
        const c = typeof ka === 'number' ? ka - (kb as number) : String(ka).localeCompare(String(kb), 'ru');
        return desc ? -c : c;
      });
    }
    return list;
  }, [rows, filter, sort, desc]);

  const play = (t: Track) => {
    if (contextUri && !custom) controls.playContext(contextUri, { uri: t.uri });
    else controls.playUris(view.map((r) => r.track.uri), t.uri);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!view.length) return;
    const i = view.findIndex((r) => r.key === sel);
    const go = (j: number) => {
      const r = view[Math.max(0, Math.min(view.length - 1, j))];
      setSel(r.key);
      document.querySelector(`[data-row="${CSS.escape(r.key)}"]`)?.scrollIntoView({ block: 'nearest' });
    };
    if (e.key === 'ArrowDown') { e.preventDefault(); go(i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); go(i - 1); }
    else if (e.key === 'Enter' && i >= 0) { e.preventDefault(); play(view[i].track); }
    else if (e.key.toLowerCase() === 'q' && i >= 0 && !e.ctrlKey) { e.preventDefault(); controls.enqueue(view[i].track); }
    else if (e.key.toLowerCase() === 'l' && i >= 0 && !e.ctrlKey) { e.preventDefault(); likes.toggle(view[i].track.uri); }
  };

  const custom = sort !== 'default' || !!filter.trim();
  const totalMs = useMemo(() => view.reduce((s, r) => s + (r.track.duration_ms || 0), 0), [view]);

  // как на виниле: альбом делится на стороны A/B (или по дискам), нумерация A1, A2…
  const sides = useMemo(() => {
    const out: ({ label: string; head?: { letter: string; count: number; ms: number } } | undefined)[] = [];
    if (!albumMode || custom || view.length < 4) return out;
    const discs = new Set(view.map((r) => r.track.disc_number ?? 1));
    const groups: Row[][] = [];
    if (discs.size > 1) [...discs].sort().forEach((d) => groups.push(view.filter((r) => (r.track.disc_number ?? 1) === d)));
    else {
      // делим по времени примерно пополам
      const half = totalMs / 2;
      let acc = 0, cut = 0;
      for (let i = 0; i < view.length; i++) { acc += view[i].track.duration_ms; if (acc >= half) { cut = i + 1; break; } }
      cut = Math.min(view.length - 1, Math.max(1, cut));
      groups.push(view.slice(0, cut), view.slice(cut));
    }
    const letters = 'ABCDEFGH';
    groups.forEach((g, gi) => g.forEach((r, j) => {
      out.push({ label: `${letters[gi]}${j + 1}`, head: j === 0 ? { letter: letters[gi], count: g.length, ms: g.reduce((x, y) => x + y.track.duration_ms, 0) } : undefined });
    }));
    return out;
  }, [albumMode, custom, view, totalMs]);

  return (
    <div className={`tracklist ${compact ? 'compact' : ''} ${albumMode ? 'album-mode' : ''}`}>
      {toolbar && (
        <div className="tl-toolbar">
          <label className="tl-filter">
            <I.filter size={15} />
            <input ref={filterRef} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Фильтр по списку" spellCheck={false}
              onKeyDown={(e) => { if (e.key === 'Escape') { setFilter(''); (e.target as HTMLInputElement).blur(); } }} />
            {filter && <button className="icon-btn xs" onClick={() => setFilter('')} title="Очистить"><I.close size={13} /></button>}
          </label>
          <div className="tl-sort">
            <I.sort size={15} />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORTS.filter(([k]) => showAdded || k !== 'added').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            {sort !== 'default' && <button className="chip" onClick={() => setDesc(!desc)}>{desc ? 'по убыванию' : 'по возрастанию'}</button>}
          </div>
          <span className="tl-meta mono">{view.length !== rows.length ? `${view.length} из ${rows.length}` : rows.length} · {fmt(totalMs)}</span>
        </div>
      )}
      <div className="tl-body" tabIndex={0} onKeyDown={onKey}>
        {view.map((r, i) => {
          const side = sides[i];
          return (
            <Fragment key={r.key}>
              {side?.head && <div className="side-head"><span className="side-letter">{side.head.letter}</span><span>Сторона {side.head.letter}</span><i /><span className="mono">{side.head.count} · {fmt(side.head.ms)}</span></div>}
              <TrackRow row={r} index={side ? side.label : String(i + 1).padStart(2, '0')} showAlbum={showAlbum} showAdded={showAdded}
                showCover={showCover} selected={sel === r.key} onSelect={setSel} onPlay={play} ctx={ctx} />
            </Fragment>
          );
        })}
        {!view.length && !loadingMore && <div className="tl-empty">{filter ? 'Ничего не найдено по фильтру' : empty ?? 'Здесь пока пусто'}</div>}
        {loadingMore && <div className="tl-loading"><span className="spinner" /> Загружаю остальное…</div>}
      </div>
    </div>
  );
}

const TrackRow = memo(function TrackRow({ row, index, showAlbum, showAdded, showCover, selected, onSelect, onPlay, ctx }: {
  row: Row; index: string; showAlbum: boolean; showAdded: boolean; showCover: boolean; selected: boolean;
  onSelect: (k: string) => void; onPlay: (t: Track) => void; ctx?: TrackCtx;
}) {
  const t = row.track;
  const current = useStore(player, (s) => s.track?.uri === t.uri || (!!t.id && s.track?.id === t.id));
  const playing = useStore(player, (s) => s.playing);
  const liked = useStore(likeStore, (s) => s.map[t.uri]);
  useEffect(() => { likes.want(t.uri); }, [t.uri]);
  const disabled = t.is_playable === false;

  return (
    <div
      className={`tl-row ${current ? 'current' : ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${showCover ? 'with-cover' : ''}`}
      data-row={row.key}
      onClick={() => onSelect(row.key)}
      onDoubleClick={() => !disabled && onPlay(t)}
      onContextMenu={(e) => { onSelect(row.key); showTrackMenu(e, t, { ...ctx, play: () => onPlay(t) }); }}
    >
      <span className="c-num">
        <span className="num mono">{current ? <Bars playing={playing} /> : index}</span>
        <button className="row-play" onClick={(e) => { e.stopPropagation(); current ? controls.toggle() : onPlay(t); }} aria-label="Играть">
          {current && playing ? <I.pause size={13} /> : <I.play size={13} />}
        </button>
      </span>
      {showCover && <Cover src={img(t.album?.images, 64)} size={38} />}
      <span className="c-main">
        <span className="c-line1">
          <span className="t-name">{t.name}</span>
          {t.explicit && <span className="explicit-tag" title="Ненормативная лексика">E</span>}
          <i className="leader" />
          <span className="c-dur mono">{fmt(t.duration_ms)}</span>
        </span>
        <span className="c-line2">
          {t.artists.map((a, j) => (
            <span key={a.id || j}>{j > 0 && ', '}<a onClick={(e) => { e.stopPropagation(); a.id && router.go({ name: 'artist', id: a.id }); }}>{a.name}</a></span>
          ))}
          {showAlbum && t.album?.name && <><span className="dot">·</span><a className="t-album" onClick={(e) => { e.stopPropagation(); t.album?.id && router.go({ name: 'album', id: t.album.id }); }}>{t.album.name}</a></>}
          {showAdded && row.added_at && <><span className="dot">·</span><span className="t-added">{dateAdded(row.added_at)}</span></>}
        </span>
      </span>
      <span className="c-actions">
        <button className={`icon-btn xs like ${liked ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); likes.toggle(t.uri); }} aria-label="Нравится">
          {liked ? <I.heartFill size={15} /> : <I.heart size={15} />}
        </button>
        <button className="icon-btn xs more" onClick={(e) => { e.stopPropagation(); showTrackMenu(e, t, { ...ctx, play: () => onPlay(t) }); }} aria-label="Ещё"><I.more size={16} /></button>
      </span>
    </div>
  );
});
