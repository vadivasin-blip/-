import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { bridge, isDesktop } from '../lib/bridge';
import { nav, router, ui } from '../lib/ui';
import { libraryStore } from '../lib/library';
import { I } from './icons';
import { Cover } from './Cover';
import { img } from '../lib/types';

export function TitleBar() {
  const { canBack, canFwd } = useStore(nav, (s) => ({ canBack: s.index > 0, canFwd: s.index < s.stack.length - 1 }));
  const me = useStore(libraryStore, (s) => s.me);
  return (
    <header className="titlebar">
      <div className="tb-brand"><Logo /><span>Grain</span></div>
      <div className="tb-nav">
        <button className="icon-btn" disabled={!canBack} onClick={router.back} title="Назад (Alt+←)"><I.back size={17} /></button>
        <button className="icon-btn" disabled={!canFwd} onClick={router.forward} title="Вперёд (Alt+→)"><I.forward size={17} /></button>
      </div>
      <button className="tb-search" onClick={() => ui.set({ palette: true })}>
        <I.search size={15} />
        <span>Поиск и команды</span>
        <kbd>Ctrl K</kbd>
      </button>
      <div className="tb-spacer" />
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
