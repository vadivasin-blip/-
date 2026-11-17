import { useMemo, useState } from 'react';
import { libraryStore } from '../lib/library';
import { player, controls } from '../lib/player';
import { useStore } from '../lib/store';
import { nav, router, openMenu, copy, shareUrl, ui, type Route } from '../lib/ui';
import { img } from '../lib/types';
import { bridge } from '../lib/bridge';
import { Cover } from './Cover';
import { Bars, I } from './icons';
import { createPlaylistFlow } from './AddToPlaylist';

const NAV: { r: Route; label: string; icon: keyof typeof I; key: string }[] = [
  { r: { name: 'home' }, label: 'Главная', icon: 'home', key: '1' },
  { r: { name: 'search' }, label: 'Поиск', icon: 'search', key: '2' },
  { r: { name: 'library' }, label: 'Медиатека', icon: 'library', key: '3' },
  { r: { name: 'stats' }, label: 'Статистика', icon: 'stats', key: '4' },
];

export function Sidebar() {
  const cur = useStore(nav, (s) => s.stack[s.index]);
  const { playlists, me } = useStore(libraryStore, (s) => ({ playlists: s.playlists, me: s.me }));
  const ctx = useStore(player, (s) => s.contextUri);
  const playing = useStore(player, (s) => s.playing);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? playlists.filter((p) => p.name.toLowerCase().includes(s)) : playlists;
  }, [playlists, q]);
  const active = (r: Route) => cur.name === r.name;
  const isCurPl = (id: string) => cur.name === 'playlist' && cur.id === id;

  return (
    <nav className="sidebar">
      <div className="sb-nav">
        {NAV.map((n) => {
          const Icon = I[n.icon];
          return (
            <button key={n.r.name} className={`sb-link ${active(n.r) ? 'on' : ''}`} onClick={() => router.go(n.r)} title={`Ctrl+${n.key}`}>
              <Icon size={18} /><span>{n.label}</span>
            </button>
          );
        })}
      </div>

      <button className={`sb-liked ${cur.name === 'liked' ? 'on' : ''}`} onClick={() => router.go({ name: 'liked' })}>
        <span className="liked-tile"><I.heartFill size={15} /></span>
        <span className="grow">Любимые треки</span>
        {ctx?.endsWith(':collection') && <Bars playing={playing} />}
      </button>

      <div className="sb-section">
        <span className="section-label">Плейлисты</span>
        <button className="icon-btn xs" title="Новый плейлист" onClick={createPlaylistFlow}><I.plus size={15} /></button>
      </div>
      {playlists.length > 8 && (
        <label className="sb-filter">
          <I.search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти плейлист" spellCheck={false}
            onKeyDown={(e) => e.key === 'Escape' && setQ('')} />
        </label>
      )}
      <div className="sb-playlists">
        {list.map((p) => (
          <button key={p.id} className={`sb-pl ${isCurPl(p.id) ? 'on' : ''}`} onClick={() => router.go({ name: 'playlist', id: p.id })}
            onDoubleClick={() => controls.playContext(p.uri)}
            onContextMenu={(e) => openMenu(e, [
              { label: 'Играть', run: () => controls.playContext(p.uri) },
              { label: 'Скопировать ссылку', run: () => copy(shareUrl(p.uri)) },
              { label: 'Открыть в Spotify', run: () => bridge.openExternal(shareUrl(p.uri)) },
            ])}>
            <Cover src={img(p.images, 64)} size={34} />
            <span className="sb-pl-text">
              <span className="sb-pl-name">{p.name}</span>
              <span className="sb-pl-owner">{p.owner?.id === me?.id ? 'Ваш' : p.owner?.display_name}</span>
            </span>
            {ctx === p.uri && <Bars playing={playing} />}
          </button>
        ))}
        {!list.length && q && <div className="sb-empty">Нет совпадений</div>}
      </div>

      <div className="sb-foot">
        <button className={`sb-link small ${cur.name === 'settings' ? 'on' : ''}`} onClick={() => router.go({ name: 'settings' })}>
          <I.settings size={17} /><span>Настройки</span>
        </button>
        <button className="icon-btn" title="Горячие клавиши (?)" onClick={() => ui.set({ shortcuts: true })}><I.keyboard size={17} /></button>
      </div>
    </nav>
  );
}
