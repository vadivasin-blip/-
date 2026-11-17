import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/spotify';
import { controls, sleep } from '../lib/player';
import { libraryStore } from '../lib/library';
import { useStore } from '../lib/store';
import { router, ui } from '../lib/ui';
import { bridge } from '../lib/bridge';
import { settings } from '../lib/settings';
import { fx } from '../lib/fx';
import { img, artistsLine, type Album, type Artist, type Track } from '../lib/types';
import { Cover } from './Cover';
import { I } from './icons';

type Item = { id: string; group: string; title: string; sub?: string; image?: string; round?: boolean; icon?: React.ReactNode; run: () => void; alt?: () => void };

const COMMANDS: Omit<Item, 'group'>[] = [
  { id: 'c-home', title: 'Главная', run: () => router.go({ name: 'home' }) },
  { id: 'c-liked', title: 'Любимые треки', run: () => router.go({ name: 'liked' }) },
  { id: 'c-lib', title: 'Полка (плейлисты, альбомы, исполнители)', run: () => router.go({ name: 'library' }) },
  { id: 'c-stats', title: 'Итоги прослушиваний', run: () => router.go({ name: 'stats' }) },
  { id: 'c-settings', title: 'Настройки', run: () => router.go({ name: 'settings' }) },
  { id: 'c-shuffle', title: 'Перемешать: вкл/выкл', run: controls.toggleShuffle },
  { id: 'c-repeat', title: 'Повтор: следующий режим', run: controls.cycleRepeat },
  { id: 'c-like', title: 'Нравится текущий трек', run: controls.toggleLike },
  { id: 'c-lyrics', title: 'Показать текст песни', run: () => ui.set({ panel: 'lyrics' }) },
  { id: 'c-queue', title: 'Показать очередь', run: () => ui.set({ panel: 'queue' }) },
  { id: 'c-full', title: 'Экран «Сейчас играет»', run: () => ui.set({ fullscreen: true }) },
  { id: 'c-mini', title: 'Мини-плеер', run: () => bridge.setMini(true) },
  { id: 'c-sleep30', title: 'Таймер сна: 30 минут', run: () => sleep.set(30) },
  { id: 'c-sleep60', title: 'Таймер сна: 1 час', run: () => sleep.set(60) },
  { id: 'c-sleept', title: 'Таймер сна: в конце трека', run: () => sleep.set('track') },
  { id: 'c-sleepoff', title: 'Таймер сна: выключить', run: () => sleep.set(null) },
  { id: 'c-keys', title: 'Горячие клавиши', run: () => ui.set({ shortcuts: true }) },
  { id: 'c-winter', title: 'Тема: новогодняя', run: () => settings.set({ theme: 'winter' }) },
  { id: 'c-classic', title: 'Тема: классическая', run: () => settings.set({ theme: 'classic' }) },
  { id: 'c-snow', title: 'Снег: вкл/выкл', run: () => settings.set({ snow: !settings.get().snow }) },
  { id: 'c-blizzard', title: 'Снег: метель', run: () => settings.set({ snow: true, snowLevel: 3 }) },
  { id: 'c-fireworks', title: 'Салют!', run: () => fx.fireworks(10) },
];

export function Palette() {
  const open = useStore(ui, (s) => s.palette);
  if (!open) return null;
  return <PaletteInner />;
}

function PaletteInner() {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [remote, setRemote] = useState<{ q: string; tracks: Track[]; artists: Artist[]; albums: Album[] } | null>(null);
  const playlists = useStore(libraryStore, (s) => s.playlists);
  const listRef = useRef<HTMLDivElement>(null);
  const close = () => ui.set({ palette: false });

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setRemote(null); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.search(s, 'track,artist,album', 6);
        setRemote({ q: s, tracks: r.tracks?.items ?? [], artists: (r.artists?.items ?? []).slice(0, 3), albums: (r.albums?.items ?? []).slice(0, 3) });
      } catch { /* сеть */ }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const items = useMemo<Item[]>(() => {
    const s = q.trim().toLowerCase();
    const match = (t: string) => !s || t.toLowerCase().includes(s);
    const out: Item[] = [];
    if (remote && remote.q.toLowerCase() === s) {
      remote.tracks.forEach((t) => out.push({
        id: t.uri, group: 'Треки', title: t.name, sub: artistsLine(t.artists), image: img(t.album.images, 64),
        run: () => controls.playUris(remote.tracks.map((x) => x.uri), t.uri), alt: () => controls.enqueue(t),
      }));
      remote.artists.forEach((a) => out.push({ id: a.uri, group: 'Исполнители', title: a.name, image: img(a.images, 64), round: true, run: () => router.go({ name: 'artist', id: a.id }) }));
      remote.albums.forEach((a) => out.push({ id: a.uri, group: 'Альбомы', title: a.name, sub: artistsLine(a.artists), image: img(a.images, 64), run: () => router.go({ name: 'album', id: a.id }) }));
    }
    playlists.filter((p) => match(p.name)).slice(0, s ? 6 : 4).forEach((p) =>
      out.push({ id: p.id, group: 'Ваши плейлисты', title: p.name, image: img(p.images, 64), run: () => router.go({ name: 'playlist', id: p.id }), alt: () => controls.playContext(p.uri) }));
    COMMANDS.filter((c) => match(c.title)).forEach((c) => out.push({ ...c, group: 'Команды', icon: <I.forward size={14} /> }));
    if (s.length >= 2) out.push({ id: 'all', group: 'Поиск', title: `Все результаты для «${q.trim()}»`, icon: <I.search size={14} />, run: () => router.go({ name: 'search', q: q.trim() }) });
    return out;
  }, [q, remote, playlists]);

  useEffect(() => setSel(0), [q, remote]);
  useEffect(() => { listRef.current?.querySelector('.pal-item.on')?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  const exec = (it: Item | undefined, alt = false) => {
    if (!it) return;
    close();
    (alt && it.alt ? it.alt : it.run)();
  };

  let lastGroup = '';
  return (
    <div className="modal-back palette-back" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="palette" role="dialog" aria-label="Поиск и команды">
        <div className="pal-input">
          <I.search size={17} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Трек, исполнитель, плейлист или команда…" spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
              else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((x) => Math.min(items.length - 1, x + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((x) => Math.max(0, x - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); exec(items[sel], e.shiftKey); }
            }} />
        </div>
        <div className="pal-list" ref={listRef}>
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? (lastGroup = it.group) : null;
            return (
              <div key={it.id + i}>
                {head && <div className="pal-group">{head}</div>}
                <button className={`pal-item ${i === sel ? 'on' : ''}`} onMouseMove={() => setSel(i)} onClick={(e) => exec(it, e.shiftKey)}>
                  {it.image !== undefined || it.round ? <Cover src={it.image} size={32} round={it.round} /> : <span className="pal-ic">{it.icon}</span>}
                  <span className="grow"><span className="pal-title">{it.title}</span>{it.sub && <small>{it.sub}</small>}</span>
                  {i === sel && <kbd>{it.alt ? 'Enter · Shift+Enter' : 'Enter'}</kbd>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="pal-foot"><span><kbd>↑↓</kbd> выбор</span><span><kbd>Enter</kbd> открыть / играть</span><span><kbd>Shift Enter</kbd> в очередь</span></div>
      </div>
    </div>
  );
}
