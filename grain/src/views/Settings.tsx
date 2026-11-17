import { useEffect, useState } from 'react';
import { auth } from '../lib/spotify';
import { settings, ACCENTS } from '../lib/settings';
import { useStore } from '../lib/store';
import { libraryStore } from '../lib/library';
import { player } from '../lib/player';
import { bridge, isDesktop } from '../lib/bridge';
import { toast, ui } from '../lib/ui';
import { Cover } from '../components/Cover';
import { img } from '../lib/types';
import { I } from '../components/icons';

export function SettingsView() {
  const s = useStore(settings, (x) => x);
  const me = useStore(libraryStore, (x) => x.me);
  const { sdk, sdkError } = useStore(player, (x) => ({ sdk: x.sdk, sdkError: x.sdkError }));
  const [info, setInfo] = useState<{ version: string; redirectUri: string; widevine: boolean } | null>(null);
  useEffect(() => { bridge.info().then(setInfo); }, []);
  const set = (p: Partial<typeof s>) => settings.set(p);
  const setPref = (p: { closeToTray?: boolean; globalHotkeys?: boolean }) => { set(p); bridge.setPrefs(p); };

  return (
    <div className="page settings">
      <h1 className="page-title">Настройки</h1>

      <section className="set-group">
        <h3>Аккаунт</h3>
        <div className="set-row">
          <Cover src={img(me?.images, 64)} size={44} round />
          <div className="grow"><b>{me?.display_name ?? '—'}</b><small>Spotify · Client ID {s.clientId ? s.clientId.slice(0, 6) + '…' : 'не задан'}</small></div>
          <button className="btn" onClick={() => auth.logout()}><I.logout size={15} /> Выйти</button>
        </div>
        <div className="set-row">
          <div className="grow"><b>Встроенный плеер</b><small>
            {sdk === 'ready' ? 'Работает: Grain — отдельное устройство Spotify Connect.' : sdk === 'error' ? sdkError : sdk === 'loading' ? 'Подключается…' : 'Не запущен'}
          </small></div>
          <span className={`status-dot ${sdk}`} />
        </div>
      </section>

      <section className="set-group">
        <h3>Внешний вид</h3>
        <div className="set-row">
          <div className="grow"><b>Акцентный цвет</b><small>Подстраиваться под обложку или один постоянный цвет</small></div>
          <div className="seg small">
            <button className={s.accentMode === 'cover' ? 'on' : ''} onClick={() => set({ accentMode: 'cover' })}>От обложки</button>
            <button className={s.accentMode === 'fixed' ? 'on' : ''} onClick={() => set({ accentMode: 'fixed' })}>Постоянный</button>
          </div>
        </div>
        {s.accentMode === 'fixed' && (
          <div className="set-row">
            <div className="grow"><b>Цвет</b></div>
            <div className="swatches">
              {ACCENTS.map((c) => <button key={c} className={`swatch ${s.accent === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ accent: c })} aria-label={c} />)}
            </div>
          </div>
        )}
        <Toggle label="Зерно" hint="Едва заметная плёночная фактура поверх интерфейса" on={s.grain} set={(v) => set({ grain: v })} />
        <Toggle label="Компактные списки" hint="Больше треков на экране" on={s.compactRows} set={(v) => set({ compactRows: v })} />
        <div className="set-row">
          <div className="grow"><b>Размер текста песен</b></div>
          <div className="seg small">
            {(['m', 'l', 'xl'] as const).map((k) => <button key={k} className={s.lyricsSize === k ? 'on' : ''} onClick={() => set({ lyricsSize: k })}>{{ m: 'Мелкий', l: 'Средний', xl: 'Крупный' }[k]}</button>)}
          </div>
        </div>
      </section>

      <section className="set-group">
        <h3>Поведение</h3>
        <Toggle label="Уведомление при смене трека" hint="Только когда окно Grain не в фокусе" on={s.notify}
          set={(v) => { set({ notify: v }); if (v && 'Notification' in window) Notification.requestPermission(); }} />
        {isDesktop && <Toggle label="Сворачивать в трей при закрытии" hint="Музыка продолжит играть, Grain — в области уведомлений" on={s.closeToTray} set={(v) => setPref({ closeToTray: v })} />}
        {isDesktop && <Toggle label="Глобальные горячие клавиши" hint="Ctrl+Alt+Пробел, Ctrl+Alt+← / →, Ctrl+Alt+↑ / ↓, Ctrl+Alt+L" on={s.globalHotkeys} set={(v) => setPref({ globalHotkeys: v })} />}
        <div className="set-row">
          <div className="grow"><b>Горячие клавиши</b><small>Полный список сочетаний</small></div>
          <button className="btn" onClick={() => ui.set({ shortcuts: true })}><I.keyboard size={15} /> Показать</button>
        </div>
      </section>

      <section className="set-group">
        <h3>Данные</h3>
        <div className="set-row">
          <div className="grow"><b>Кэш текстов песен</b><small>Тексты и сдвиги синхронизации хранятся локально</small></div>
          <button className="btn" onClick={() => {
            Object.keys(localStorage).filter((k) => k.startsWith('grain.lyr')).forEach((k) => localStorage.removeItem(k));
            toast('Кэш текстов очищен');
          }}>Очистить</button>
        </div>
      </section>

      <div className="about">
        Grain {info?.version} · Redirect URI: <code>{info?.redirectUri}</code> · Тексты: LRCLIB
        {info && !info.widevine && isDesktop && <> · сборка без Widevine</>}
      </div>
    </div>
  );
}

function Toggle({ label, hint, on, set }: { label: string; hint?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="set-row clickable">
      <div className="grow"><b>{label}</b>{hint && <small>{hint}</small>}</div>
      <span className={`switch ${on ? 'on' : ''}`}><input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} /><i /></span>
    </label>
  );
}
