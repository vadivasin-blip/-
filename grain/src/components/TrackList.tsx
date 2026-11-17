import { memo, useEffect, useMemo, useRef, useState } from 'react';
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

  const custom = sort !== 'default' || !!filter.trim();
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

  const totalMs = useMemo(() => view.reduce((s, r) => s + (r.track.duration_ms || 0), 0), [view]);

  return (
    <div className={`tracklist ${compact ? 'compact' : ''} ${showAlbum ? 'with-album' : ''} ${showAdded ? 'with-added' : ''} ${albumMode ? 'album-mode' : ''}`}>
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
      <div className="tl-head">
        <span className="c-num">#</span>
        <span className="c-title">Название</span>
        {showAlbum && <span className="c-album">Альбом</span>}
        {showAdded && <span className="c-added">Добавлен</span>}
        <span className="c-like" />
        <span className="c-dur"><I.clock size={14} /></span>
        <span className="c-more" />
      </div>
      <div className="tl-body" tabIndex={0} onKeyDown={onKey}>
        {view.map((r, i) => (
          <TrackRow key={r.key} row={r} index={albumMode ? r.track.track_number ?? i + 1 : i + 1} showAlbum={showAlbum} showAdded={showAdded}
            showCover={showCover} selected={sel === r.key} onSelect={setSel} onPlay={play} ctx={ctx} />
        ))}
        {!view.length && !loadingMore && <div className="tl-empty">{filter ? 'Ничего не найдено по фильтру' : empty ?? 'Здесь пока пусто'}</div>}
        {loadingMore && <div className="tl-loading"><span className="spinner" /> Загружаю остальное…</div>}
      </div>
    </div>
  );
}

const TrackRow = memo(function TrackRow({ row, index, showAlbum, showAdded, showCover, selected, onSelect, onPlay, ctx }: {
  row: Row; index: number; showAlbum: boolean; showAdded: boolean; showCover: boolean; selected: boolean;
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
      className={`tl-row ${current ? 'current' : ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      data-row={row.key}
      onClick={() => onSelect(row.key)}
      onDoubleClick={() => !disabled && onPlay(t)}
      onContextMenu={(e) => { onSelect(row.key); showTrackMenu(e, t, { ...ctx, play: () => onPlay(t) }); }}
    >
      <span className="c-num">
        <span className="num mono">{current ? <Bars playing={playing} /> : index}</span>
        <button className="row-play" onClick={(e) => { e.stopPropagation(); current ? controls.toggle() : onPlay(t); }} aria-label="Играть">
          {current && playing ? <I.pause size={14} /> : <I.play size={14} />}
        </button>
      </span>
      <span className="c-title">
        {showCover && <Cover src={img(t.album?.images, 64)} size={36} />}
        <span className="t-text">
          <span className="t-name">{t.name}</span>
          <span className="t-artists">
            {t.explicit && <I.explicit size={13} className="explicit" />}
            {t.artists.map((a, j) => (
              <span key={a.id || j}>{j > 0 && ', '}<a onClick={(e) => { e.stopPropagation(); a.id && router.go({ name: 'artist', id: a.id }); }}>{a.name}</a></span>
            ))}
          </span>
        </span>
      </span>
      {showAlbum && (
        <span className="c-album"><a onClick={(e) => { e.stopPropagation(); t.album?.id && router.go({ name: 'album', id: t.album.id }); }}>{t.album?.name}</a></span>
      )}
      {showAdded && <span className="c-added">{dateAdded(row.added_at)}</span>}
      <span className="c-like">
        <button className={`icon-btn xs like ${liked ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); likes.toggle(t.uri); }} aria-label="Нравится">
          {liked ? <I.heartFill size={15} /> : <I.heart size={15} />}
        </button>
      </span>
      <span className="c-dur mono">{fmt(t.duration_ms)}</span>
      <span className="c-more">
        <button className="icon-btn xs" onClick={(e) => { e.stopPropagation(); showTrackMenu(e, t, { ...ctx, play: () => onPlay(t) }); }} aria-label="Ещё"><I.more size={16} /></button>
      </span>
    </div>
  );
});
