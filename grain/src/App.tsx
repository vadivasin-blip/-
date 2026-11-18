import { useEffect, useState } from 'react';
import { auth } from './lib/spotify';
import { finishLogin, type Session } from './lib/auth';
import { bridge, isDesktop } from './lib/bridge';
import { demoRequest } from './lib/demo';
import { loadLibrary } from './lib/library';
import { controls, loadSdk, player, startSync } from './lib/player';
import { settings } from './lib/settings';
import { useStore } from './lib/store';
import { nav, router, ui } from './lib/ui';
import { coverColor } from './lib/color';
import { img } from './lib/types';
import { initDesktop } from './lib/desktop';
import { initUpdates } from './lib/updates';
import { TopBar } from './components/TopBar';
import { Deck } from './components/Deck';
import { Snow } from './components/winter/Snow';
import { Garland } from './components/winter/Garland';
import { Drift } from './components/winter/Drift';
import { useTheme } from './lib/season';
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
import { Landing } from './views/Landing';

type Status = 'boot' | 'out' | 'in';
const DEMO = new URLSearchParams(location.search).has('demo');

export function App() {
  const [status, setStatus] = useState<Status>('boot');
  const [loginError, setLoginError] = useState<string | null>(null);
  // в браузере новый посетитель сначала видит страницу о Grain, а не форму входа
  const [showLogin, setShowLogin] = useState(() => isDesktop || /[?&](code|error|login)=?/.test(location.search));
  const mini = useStore(ui, (s) => s.mini);

  useEffect(() => {
    auth.onLoggedOut(() => { if (DEMO) location.search = ''; else setStatus('out'); });
    if (DEMO) {
      auth.useDemo(demoRequest);
      setStatus('in');
      if (new URLSearchParams(location.search).has('mini')) ui.set({ mini: true });
      return;
    }
    // веб-версия: Spotify вернул нас на сайт с ?code=… — завершаем вход и чистим адрес
    const qs = new URLSearchParams(location.search);
    if (!isDesktop && (qs.has('code') || qs.has('error'))) {
      history.replaceState(null, '', location.pathname);
      setStatus('out');
      handleCallback({ code: qs.get('code'), state: qs.get('state'), error: qs.get('error') });
    } else {
      bridge.getSecret().then((s: Session | null) => {
        if (s?.refresh) { auth.set(s); setStatus('in'); } else setStatus('out');
      });
    }
    return bridge.onAuth(handleCallback);
  }, []);

  async function handleCallback({ code, state, error }: { code: string | null; state: string | null; error: string | null }) {
    if (error || !code) { setLoginError(error === 'access_denied' ? 'Вы отменили вход.' : `Spotify вернул ошибку: ${error}`); return; }
    try { const s = await finishLogin(code, state); auth.set(s); setLoginError(null); setStatus('in'); }
    catch (e) { setLoginError((e as Error).message); }
  }

  useEffect(() => {
    if (status !== 'in') return;
    loadLibrary().catch((e) => console.warn('library', e));
    loadSdk();
    startSync();
  }, [status]);

  useEffect(() => {
    initDesktop();
    initUpdates();
    const offNav = bridge.onNav((d) => (d === 'back' ? router.back() : router.forward()));
    const offMini = bridge.onMini((on) => ui.set({ mini: on }));
    return () => { offNav(); offMini(); };
  }, []);

  useAccent();
  useGrain();
  useShortcuts(status === 'in');

  if (status === 'boot') return <div className="boot" />;
  if (status === 'out' && !showLogin) return <Landing onOpenPlayer={() => setShowLogin(true)} />;
  if (status === 'out') return <><Login error={loginError} onCallback={handleCallback} onBack={isDesktop ? undefined : () => setShowLogin(false)} /><Winter mini={false} /></>;
  if (mini) return <><MiniPlayer /><Winter mini /></>;

  return (
    <div className="app">
      <TopBar />
      <div className="stage">
        <Deck />
        <Main />
      </div>
      <Winter mini={false} />
      <FullscreenNow />
      <Palette />
      <AddToPlaylist />
      <Shortcuts />
      <ContextMenu />
      <Toasts />
    </div>
  );
}

/** Новогодние украшения поверх интерфейса. */
function Winter({ mini }: { mini: boolean }) {
  const theme = useTheme();
  const s = useStore(settings, (x) => ({ snow: x.snow, level: x.snowLevel, garland: x.garland, drift: x.drift }));
  if (theme !== 'winter') return null;
  return (
    <>
      <Snow enabled={s.snow} level={mini ? 1 : s.level} />
      {s.garland && !mini && <Garland />}
      {s.drift && !mini && <Drift />}
    </>
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
  const theme = useTheme();
  useEffect(() => { document.documentElement.classList.toggle('grain', on); }, [on]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
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
        router.go([{ name: 'home' }, { name: 'library' }, { name: 'search' }, { name: 'stats' }][Number(k) - 1] as any);
        return;
      }
      if (ctrl && k === 'l') { e.preventDefault(); ui.set({ panel: u.panel === 'lyrics' ? 'now' : 'lyrics' }); return; }
      if (ctrl && k === 'q') { e.preventDefault(); ui.set({ panel: u.panel === 'queue' ? 'now' : 'queue' }); return; }
      if (ctrl && k === 'm' && isDesktop) { e.preventDefault(); bridge.setMini(true); return; }
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


