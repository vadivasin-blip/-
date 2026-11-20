import { useEffect, useState } from 'react';
import { beginLogin, parseCallback } from '../lib/auth';
import { settings } from '../lib/settings';
import { bridge, isDesktop } from '../lib/bridge';
import { copy } from '../lib/ui';
import { Logo, WindowControls } from '../components/TopBar';
import { NetworkPanel } from '../components/NetworkPanel';
import { I } from '../components/icons';

type Cb = { code: string | null; state: string | null; error: string | null };

export function Login({ error, waiting, onCallback, onBack }: { error?: string | null; waiting?: boolean; onCallback: (v: Cb) => void; onBack?: () => void }) {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [pasteErr, setPasteErr] = useState<string | null>(null);
  const [netOpen, setNetOpen] = useState(false);
  const [netErr, setNetErr] = useState<string | null>(null);
  useEffect(() => bridge.onAuthNetError((e) => { setNetErr(`Страница входа Spotify не открылась (${e.desc || e.code}).`); setNetOpen(true); }), []);
  const [clientId, setClientId] = useState(settings.get().clientId);
  const [redirect, setRedirect] = useState('http://127.0.0.1:43117/callback');
  const [started, setStarted] = useState(false);
  useEffect(() => { bridge.info().then((i) => setRedirect(i.redirectUri)); }, []);
  const valid = /^[0-9a-f]{32}$/i.test(clientId.trim());

  const go = () => {
    const id = clientId.trim();
    settings.set({ clientId: id });
    setStarted(true);
    beginLogin(id).then(setAuthUrl);
  };

  return (
    <div className="login">
      <div className="login-drag"><WindowControls /></div>
      <div className="login-card">
        {onBack && <button className="link-btn login-back" onClick={onBack}>← о Grain</button>}
        <div className="login-brand"><Logo size={30} /><span>Grain</span></div>
        <p className="login-lead">Плеер для вашей библиотеки Spotify. Нужен аккаунт Premium и собственный ключ приложения — это займёт пару минут, один раз.</p>

        <ol className="steps">
          <li>
            <b>Создайте приложение</b> на{' '}
            <a onClick={() => bridge.openExternal('https://developer.spotify.com/dashboard')}>developer.spotify.com/dashboard</a>
            {' '}— «Create app», любое название.
          </li>
          <li>
            <b>Redirect URI</b> — вставьте ровно этот адрес:
            <button className="copy-field" onClick={() => copy(redirect, 'Адрес скопирован')}>
              <code>{redirect}</code><I.link size={14} />
            </button>
          </li>
          <li><b>APIs used</b> — отметьте «Web API» и «Web Playback SDK», сохраните.</li>
          <li><b>Скопируйте Client ID</b> со страницы приложения и вставьте сюда:</li>
        </ol>

        <form onSubmit={(e) => { e.preventDefault(); if (valid) go(); }} className="login-form">
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID — 32 символа" spellCheck={false} autoFocus className="mono" />
          <button className="btn primary" disabled={!valid}>Войти через Spotify</button>
        </form>

        {(started || waiting) && !error && <div className="login-note"><span className="spinner" /> {isDesktop ? "Подтвердите вход в открывшемся окне Spotify — после этого Grain откроется сам." : "Переходим на страницу входа Spotify…"}</div>}
        {error && <div className="login-note err">{error}</div>}

        {isDesktop && (
          <div className="login-net">
            <button className="link-btn" onClick={() => setNetOpen(!netOpen)}>{netOpen ? '▾' : '▸'} Spotify не открывается? Настройки сети и прокси</button>
            {netErr && <div className="login-note err">{netErr} Включите VPN или укажите его прокси ниже, сохраните и нажмите «Войти» ещё раз.</div>}
            {netOpen && <NetworkPanel compact />}
          </div>
        )}

        {authUrl && isDesktop && (
          <div className="login-manual">
            <b>Браузер не открылся или вход не завершается?</b>
            <ol>
              <li>
                Окно входа не открылось? Откройте вход в браузере или скопируйте ссылку туда, где Spotify работает:
                <button className="btn" onClick={() => copy(authUrl, 'Ссылка входа скопирована')}><I.link size={14} /> Скопировать ссылку входа</button>{' '}
                <button className="btn" onClick={() => bridge.openExternal(authUrl)}>Открыть в браузере</button>
              </li>
              <li>
                После подтверждения браузер попытается открыть адрес <code>127.0.0.1:43117/callback?code=…</code>.
                Если страница не открылась (так будет на телефоне), скопируйте этот адрес из адресной строки целиком и вставьте сюда:
              </li>
            </ol>
            <form className="login-form" onSubmit={(e) => {
              e.preventDefault();
              const cb = parseCallback(pasted);
              if (!cb) { setPasteErr('В адресе нет кода входа. Нужна ссылка, которая начинается с http://127.0.0.1:43117/callback?code='); return; }
              setPasteErr(null);
              onCallback(cb);
            }}>
              <input value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="http://127.0.0.1:43117/callback?code=…" spellCheck={false} className="mono" />
              <button className="btn primary" disabled={!pasted.trim()}>Готово</button>
            </form>
            {pasteErr && <div className="login-note err">{pasteErr}</div>}
          </div>
        )}
        <div className="login-foot">
          <span>{isDesktop ? 'Ключ и токены хранятся только на этом компьютере, в зашифрованном виде.' : 'Ключ и токены хранятся только в этом браузере. Нужен Chrome, Edge или Firefox на компьютере.'}</span>
          {!isDesktop && <a onClick={() => bridge.openExternal('https://github.com/vadivasin-blip/-/releases/latest/download/Grain-Setup.exe')}>Скачать Grain для Windows</a>}
          <a onClick={() => (location.search = '?demo')}>Посмотреть интерфейс на демо-данных</a>
        </div>
      </div>
    </div>
  );
}
