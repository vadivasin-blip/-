import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { bridge, isDesktop } from '../lib/bridge';
import { nav, router, ui, type Route } from '../lib/ui';
import { auth } from '../lib/spotify';
import { settings } from '../lib/settings';
import { useTheme } from '../lib/season';
import { Countdown } from './winter/Countdown';
import { libraryStore } from '../lib/library';
import { I } from './icons';
import { Cover } from './Cover';
import { img } from '../lib/types';

const NAV: { r: Route; label: string; key: string }[] = [
  { r: { name: 'home' }, label: 'Главная', key: '1' },
  { r: { name: 'library' }, label: 'Полка', key: '2' },
  { r: { name: 'search' }, label: 'Поиск', key: '3' },
  { r: { name: 'stats' }, label: 'Итоги', key: '4' },
];

export function TopBar() {
  const { canBack, canFwd, cur } = useStore(nav, (s) => ({ canBack: s.index > 0, canFwd: s.index < s.stack.length - 1, cur: s.stack[s.index] }));
  const me = useStore(libraryStore, (s) => s.me);
  const theme = useTheme();
  const showCountdown = useStore(settings, (s) => s.countdown);
  const active = (r: Route) => cur.name === r.name || (r.name === 'library' && ['playlist', 'liked'].includes(cur.name));
  return (
    <header className="topbar">
      <div className="tb-brand"><Logo /><span>Grain</span></div>
      <div className="tb-nav">
        <button className="icon-btn" disabled={!canBack} onClick={router.back} title="Назад (Alt+←)"><I.back size={17} /></button>
        <button className="icon-btn" disabled={!canFwd} onClick={router.forward} title="Вперёд (Alt+→)"><I.forward size={17} /></button>
      </div>
      <nav className="tb-tabs">
        {NAV.map((n) => (
          <button key={n.r.name} className={active(n.r) ? 'on' : ''} onClick={() => router.go(n.r)} title={`Ctrl+${n.key}`}>{n.label}</button>
        ))}
      </nav>
      <div className="tb-spacer" />
      {auth.isDemo() && <span className="demo-badge" title="Выдуманные исполнители и обложки, нарисованные Grain. С аккаунтом всё берётся из Spotify">демо-данные</span>}
      {theme === 'winter' && showCountdown && <Countdown />}
      <button className="tb-search" onClick={() => ui.set({ palette: true })}>
        <I.search size={15} />
        <span>Найти</span>
        <kbd>Ctrl K</kbd>
      </button>
      <button className={`icon-btn ${cur.name === 'settings' ? 'on-solid' : ''}`} onClick={() => router.go({ name: 'settings' })} title="Настройки"><I.settings size={17} /></button>
      {me && (
        <button className="tb-user" onClick={() => router.go({ name: 'settings' })} title={me.display_name}>
          <Cover src={img(me.images, 40)} size={24} round />
        </button>
      )}
      <WindowControls />
    </header>
  );
}

export function Logo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="logo">
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".55" />
      <circle cx="16" cy="16" r="3" fill="var(--accent)" />
    </svg>
  );
}

/** Свои кнопки окна: рамки нет, чтобы мини-плеер и полноэкранный режим выглядели чисто. */
export function WindowControls() {
  const [max, setMax] = useState(false);
  useEffect(() => {
    if (!isDesktop) return;
    bridge.isMaximized().then(setMax);
    return bridge.onWinState((s) => setMax(s.maximized));
  }, []);
  if (!isDesktop) return null;
  return (
    <div className="winctl">
      <button onClick={bridge.minimize} aria-label="Свернуть"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" strokeWidth="1" /></svg></button>
      <button onClick={bridge.toggleMax} aria-label={max ? 'Восстановить' : 'Развернуть'}>
        {max
          ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x=".5" y="2.5" width="7" height="7" /><path d="M2.5 2.5V.5h7v7h-2" /></svg>
          : <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x=".5" y=".5" width="9" height="9" /></svg>}
      </button>
      <button className="close" onClick={bridge.close} aria-label="Закрыть"><svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.1"><path d="M0 0l10 10M10 0 0 10" /></svg></button>
    </div>
  );
}
