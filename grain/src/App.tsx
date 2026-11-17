import { useEffect, useState } from 'react';
import { auth } from './lib/spotify';
import { finishLogin, type Session } from './lib/auth';
import { bridge } from './lib/bridge';
import { demoRequest } from './lib/demo';
import { loadLibrary } from './lib/library';
import { controls, loadSdk, player, startSync } from './lib/player';
import { settings } from './lib/settings';
import { useStore } from './lib/store';
import { nav, router, ui } from './lib/ui';
import { coverColor } from './lib/color';
import { img } from './lib/types';
import { initDesktop } from './lib/desktop';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { RightPanel } from './components/RightPanel';
import { ContextMenu, Shortcuts, Toasts } from './components/Overlays';
import { Palette } from './components/Palette';
import { AddToPlaylist } from './components/AddToPlaylist';
import { FullscreenNow, MiniPlayer } from './components/NowPlaying';
import { Home } from './views/Home';
import { SearchView } from './views/Search';
import { LibraryView } from './views/Library';
import { LikedView, PlaylistView } from './views/Collection';
import { AlbumView } from './views/Album';
import { ArtistView } from './views/Artist';
import { StatsView } from './views/Stats';
import { SettingsView } from './views/Settings';
import { Login } from './views/Login';

type Status = 'boot' | 'out' | 'in';
const DEMO = new URLSearchParams(location.search).has('demo');

export function App() {
  const [status, setStatus] = useState<Status>('boot');
  const [loginError, setLoginError] = useState<string | null>(null);
  const mini = useStore(ui, (s) => s.mini);

  useEffect(() => {
    auth.onLoggedOut(() => { if (DEMO) location.search = ''; else setStatus('out'); });
    if (DEMO) {
      auth.useDemo(demoRequest);
      setStatus('in');
      if (new URLSearchParams(location.search).has('mini')) ui.set({ mini: true });
      return;
    }
    bridge.getSecret().then((s: Session | null) => {
      if (s?.refresh) { auth.set(s); setStatus('in'); } else setStatus('out');
    });
    return bridge.onAuth(async ({ code, state, error }) => {
      if (error || !code) { setLoginError(error === 'access_denied' ? 'Вы отменили вход.' : `Spotify вернул ошибку: ${error}`); return; }
      try { const s = await finishLogin(code, state); auth.set(s); setLoginError(null); setStatus('in'); }
      catch (e) { setLoginError((e as Error).message); }
    });
  }, []);

  useEffect(() => {
    if (status !== 'in') return;
    loadLibrary().catch((e) => console.warn('library', e));
    loadSdk();
    startSync();
  }, [status]);

  useEffect(() => {
    initDesktop();
    const offNav = bridge.onNav((d) => (d === 'back' ? router.back() : router.forward()));
    const offMini = bridge.onMini((on) => ui.set({ mini: on }));
    return () => { offNav(); offMini(); };
  }, []);

  useAccent();
  useGrain();
  useShortcuts(status === 'in');

  if (status === 'boot') return <div className="boot" />;
  if (status === 'out') return <Login error={loginError} />;
  if (mini) return <MiniPlayer />;

  return (
    <div className="app">
      <TitleBar />
      <div className="body">
        <Sidebar />
        <Main />
        <RightPanel />
      </div>
      <PlayerBar />
      <FullscreenNow />
      <Palette />
      <AddToPlaylist />
      <Shortcuts />
      <ContextMenu />
      <Toasts />
    </div>
  );
}

function Main() {
  const { r, index } = useStore(nav, (s) => ({ r: s.stack[s.index], index: s.index }));
  useEffect(() => {
    const el = document.querySelector('.main-scroll');
    if (el) el.scrollTop = router.savedScroll(index);
  }, [index]);
  let view: React.ReactNode;
  switch (r.name) {
    case 'home': view = <Home />; break;
    case 'search': view = <SearchView initial={r.q} />; break;
    case 'library': view = <LibraryView tab={r.tab} />; break;
    case 'liked': view = <LikedView />; break;
    case 'stats': view = <StatsView />; break;
    case 'settings': view = <SettingsView />; break;
    case 'playlist': view = <PlaylistView key={r.id} id={r.id} />; break;
    case 'album': view = <AlbumView key={r.id} id={r.id} />; break;
    case 'artist': view = <ArtistView key={r.id} id={r.id} />; break;
  }
  return <main className="main-scroll" key={index}>{view}</main>;
}

/** Акцентный цвет: из обложки текущего трека либо фиксированный. */
function useAccent() {
  const cover = useStore(player, (s) => img(s.track?.album?.images, 64));
  const { accentMode, accent } = useStore(settings, (s) => ({ accentMode: s.accentMode, accent: s.accent }));
  useEffect(() => {
    let alive = true;
    const apply = (c: string) => document.documentElement.style.setProperty('--accent', c);
    if (accentMode === 'fixed') { apply(accent); return; }
    coverColor(cover).then((c) => { if (alive) apply(c ?? accent); });
    return () => { alive = false; };
  }, [cover, accentMode, accent]);
}

function useGrain() {
  const on = useStore(settings, (s) => s.grain);
  useEffect(() => { document.documentElement.classList.toggle('grain', on); }, [on]);
}

function useShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const u = ui.get();
      if (ctrl && k === 'k') { e.preventDefault(); ui.set({ palette: !u.palette }); return; }
      if (u.palette || u.addTo) return;
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); router.back(); return; }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); router.forward(); return; }
      if (ctrl && ['1', '2', '3', '4'].includes(k)) {
        e.preventDefault();
        router.go([{ name: 'home' }, { name: 'search' }, { name: 'library' }, { name: 'stats' }][Number(k) - 1] as any);
        return;
      }
      if (ctrl && k === 'l') { e.preventDefault(); ui.set({ panel: u.panel === 'lyrics' ? null : 'lyrics' }); return; }
      if (ctrl && k === 'q') { e.preventDefault(); ui.set({ panel: u.panel === 'queue' ? null : 'queue' }); return; }
      if (ctrl && k === 'm') { e.preventDefault(); bridge.setMini(true); return; }
      if (ctrl && e.key === 'ArrowRight') { e.preventDefault(); controls.next(); return; }
      if (ctrl && e.key === 'ArrowLeft') { e.preventDefault(); controls.prev(); return; }
      if (typing || ctrl || e.altKey) return;
      // внутри списка треков свои клавиши (стрелки, Enter, Q, L)
      const inList = !!t.closest?.('.tl-body');
      if (e.key === ' ') { e.preventDefault(); controls.toggle(); }
      else if (e.key === 'Escape') { if (u.fullscreen) ui.set({ fullscreen: false }); else if (u.shortcuts) ui.set({ shortcuts: false }); }
      else if (inList) return;
      else if (e.key === 'ArrowRight') { e.preventDefault(); controls.seekBy(e.shiftKey ? 30000 : 5000); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); controls.seekBy(e.shiftKey ? -30000 : -5000); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); controls.setVolume(player.get().volume + 5); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); controls.setVolume(player.get().volume - 5); }
      else if (k === 'm') controls.toggleMute();
      else if (k === 'l') controls.toggleLike();
      else if (k === 's') controls.toggleShuffle();
      else if (k === 'r') controls.cycleRepeat();
      else if (k === 'f') ui.set({ fullscreen: !u.fullscreen });
      else if (e.key === '?') ui.set({ shortcuts: !u.shortcuts });
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [enabled]);
}


