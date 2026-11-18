import { useEffect, useState } from 'react';
import { auth } from '../lib/spotify';
import { settings, ACCENTS } from '../lib/settings';
import { useStore } from '../lib/store';
import { libraryStore } from '../lib/library';
import { player, playbackMode } from '../lib/player';
import { bridge, isDesktop } from '../lib/bridge';
import { toast, ui } from '../lib/ui';
import { Cover } from '../components/Cover';
import { img } from '../lib/types';
import { I } from '../components/icons';
import { useTheme } from '../lib/season';
import { update, updates } from '../lib/updates';
import { fx } from '../lib/fx';

export function SettingsView() {
  const s = useStore(settings, (x) => x);
  const me = useStore(libraryStore, (x) => x.me);
  const { sdk, sdkError } = useStore(player, (x) => ({ sdk: x.sdk, sdkError: x.sdkError }));
  const [info, setInfo] = useState<{ version: string; redirectUri: string; widevine: boolean } | null>(null);
  useEffect(() => { bridge.info().then(setInfo); }, []);
  const set = (p: Partial<typeof s>) => settings.set(p);
  const theme = useTheme();
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
          <div className="grow"><b>Где играет звук</b><small>
            {s.playback === 'spotify'
              ? 'Через приложение Spotify на компьютере или телефоне. Grain — оболочка и пульт. Самый надёжный вариант.'
              : sdk === 'ready' ? 'Внутри Grain (встроенный плеер). Если треки не включаются, Grain сам перейдёт на приложение Spotify.'
                : sdk === 'error' ? sdkError : sdk === 'loading' ? 'Встроенный плеер подключается…' : 'Встроенный плеер не запущен'}
          </small></div>
          <div className="seg small">
            <button className={s.playback === 'auto' ? 'on' : ''} onClick={() => playbackMode.set('auto')}>Внутри Grain</button>
            <button className={s.playback === 'spotify' ? 'on' : ''} onClick={() => playbackMode.set('spotify')}>Приложение Spotify</button>
          </div>
        </div>
      </section>

      <section className="set-group">
        <h3>Тема</h3>
        <div className="theme-pick">
          {([['winter', 'Новогодняя', 'Ночное небо, снег, гирлянда, отсчёт до праздника'], ['classic', 'Классика', 'Тёплый тёмный: эспрессо и крем'], ['auto', 'По сезону', 'Новогодняя с 1 декабря по 14 января']] as const).map(([k, l, d]) => (
            <button key={k} className={`theme-card t-${k} ${s.theme === k ? 'on' : ''}`} onClick={() => set({ theme: k })}>
              <span className="theme-swatch"><i /><i /><i /></span>
              <b>{l}</b><small>{d}</small>
            </button>
          ))}
        </div>
        {theme === 'winter' && (
          <>
            <Toggle label="Снег" hint="На паузе снежинки почти замирают, ветер — от движения мыши, клик выбивает снежное облачко" on={s.snow} set={(v) => set({ snow: v })} />
            {s.snow && (
              <div className="set-row">
                <div className="grow"><b>Снегопад</b></div>
                <div className="seg small">
                  {([[1, 'Лёгкий'], [2, 'Обычный'], [3, 'Метель']] as const).map(([k, l]) => <button key={k} className={s.snowLevel === k ? 'on' : ''} onClick={() => set({ snowLevel: k })}>{l}</button>)}
                </div>
              </div>
            )}
            <Toggle label="Гирлянда" hint="Огни бегут, пока играет музыка, и ровно светятся на паузе" on={s.garland} set={(v) => set({ garland: v })} />
            <Toggle label="Сугроб" hint="Растёт внизу окна, пока вы слушаете. Клик — разгрести" on={s.drift} set={(v) => set({ drift: v })} />
            <Toggle label="Отсчёт до Нового года" hint="В полночь 1 января — салют" on={s.countdown} set={(v) => set({ countdown: v })} />
            <div className="set-row">
              <div className="grow"><b>Салют</b><small>Проверить, как будет в новогоднюю ночь</small></div>
              <button className="btn" onClick={() => fx.fireworks(10)}>Запустить</button>
            </div>
          </>
        )}
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
        <Toggle label="Вращать пластинку" hint="Выключите, если анимация отвлекает" on={s.spin} set={(v) => set({ spin: v })} />
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

      {isDesktop && <UpdatesSection />}

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

function UpdatesSection() {
  const u = useStore(updates, (x) => x);
  const status = {
    idle: 'Проверка ещё не запускалась',
    dev: 'В режиме разработки обновления отключены',
    checking: 'Проверяю…',
    latest: 'У вас последняя версия',
    available: `Доступна версия ${u.version}`,
    downloading: `Скачиваю версию ${u.version ?? ''} — ${u.percent ?? 0}%`,
    ready: `Версия ${u.version} скачана — осталось перезапустить`,
    error: `Не получилось: ${u.error ?? 'ошибка'}`,
  }[u.state];
  return (
    <section className="set-group">
      <h3>Обновления</h3>
      <div className="set-row">
        <div className="grow"><b>Grain {u.current ?? ''}</b><small>{status}</small></div>
        {u.state === 'available' && <button className="btn primary" onClick={update.download}>{u.portable ? 'Скачать с GitHub' : `Обновить до ${u.version}`}</button>}
        {u.state === 'ready' && <button className="btn primary" onClick={update.install}>Перезапустить и обновить</button>}
        {u.state === 'downloading' && <span className="upd-bar"><i style={{ width: `${u.percent ?? 0}%` }} /></span>}
        {['idle', 'latest', 'error'].includes(u.state) && <button className="btn" onClick={update.check}>Проверить обновления</button>}
        {u.state === 'checking' && <span className="spinner" />}
      </div>
      {u.notes && ['available', 'downloading', 'ready'].includes(u.state) && (
        <div className="upd-notes">
          <div className="section-label">Что нового в {u.version}</div>
          <pre>{u.notes.trim()}</pre>
        </div>
      )}
      <div className="set-row">
        <div className="grow"><small>Grain сам проверяет обновления при запуске и раз в 6 часов. Установка занимает несколько секунд, настройки и вход сохраняются.</small></div>
      </div>
    </section>
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
