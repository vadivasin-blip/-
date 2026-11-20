import { bridge, isDesktop } from './bridge';

export const SCOPES = [
  'streaming', 'user-read-email', 'user-read-private',
  'user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing',
  'user-library-read', 'user-library-modify',
  'playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-private', 'playlist-modify-public',
  'user-follow-read', 'user-follow-modify', 'user-top-read', 'user-read-recently-played',
].join(' ');

export type Session = { clientId: string; access: string; refresh: string; expires: number };

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function randomString(len = 64) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return b64url(bytes).slice(0, len);
}

let pending: { verifier: string; state: string; clientId: string; redirect: string } | null = null;

export async function beginLogin(clientId: string) {
  const { redirectUri } = await bridge.info();
  const verifier = randomString(96);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = randomString(24);
  pending = { verifier, state, clientId, redirect: redirectUri };
  sessionStorage.setItem('grain.pkce', JSON.stringify(pending));
  const q = new URLSearchParams({
    client_id: clientId, response_type: 'code', redirect_uri: redirectUri,
    code_challenge_method: 'S256', code_challenge: challenge, scope: SCOPES, state,
  });
  const url = `https://accounts.spotify.com/authorize?${q}`;
  // в браузере уходим на Spotify в этой же вкладке и возвращаемся обратно на сайт
  // в программе вход открывается в окне Grain — через тот же прокси, браузер не нужен
  if (isDesktop) bridge.openAuth(url); else location.assign(url);
  return url;
}

/** Разбор адреса, на который Spotify перекинул после входа (для ручной вставки). */
export function parseCallback(text: string): { code: string | null; state: string | null; error: string | null } | null {
  const m = text.trim().match(/[?&]code=([^&\s#]+)/);
  const st = text.trim().match(/[?&]state=([^&\s#]+)/);
  const er = text.trim().match(/[?&]error=([^&\s#]+)/);
  if (!m && !er) return null;
  return { code: m ? decodeURIComponent(m[1]) : null, state: st ? decodeURIComponent(st[1]) : null, error: er ? decodeURIComponent(er[1]) : null };
}

const NETWORK_MSG = 'Компьютер не может связаться с серверами Spotify (accounts.spotify.com). Похоже, Spotify недоступен в этой сети: включите VPN на компьютере (для всей системы, не только в браузере) и попробуйте снова.';
async function tokenRequest(body: URLSearchParams) {
  try {
    return await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
  } catch {
    throw new Error(NETWORK_MSG);
  }
}

export async function finishLogin(code: string, state: string | null): Promise<Session> {
  const p = pending ?? JSON.parse(sessionStorage.getItem('grain.pkce') || 'null');
  if (!p || p.state !== state) throw new Error('Эта ссылка от другой попытки входа. Нажмите «Войти через Spotify» ещё раз и используйте новую ссылку.');
  const res = await tokenRequest(new URLSearchParams({
    grant_type: 'authorization_code', code, redirect_uri: p.redirect,
    client_id: p.clientId, code_verifier: p.verifier,
  }));
  const j = await res.json();
  if (!res.ok) throw new Error(j.error_description || j.error || 'Не удалось получить токен');
  pending = null;
  sessionStorage.removeItem('grain.pkce');
  const s: Session = { clientId: p.clientId, access: j.access_token, refresh: j.refresh_token, expires: Date.now() + j.expires_in * 1000 };
  await bridge.setSecret(s);
  return s;
}

export async function refreshSession(s: Session): Promise<Session> {
  const res = await tokenRequest(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: s.refresh, client_id: s.clientId }));
  const j = await res.json();
  if (!res.ok) {
    const err = new Error(j.error_description || 'refresh failed') as Error & { fatal?: boolean };
    err.fatal = j.error === 'invalid_grant';
    throw err;
  }
  const next: Session = {
    clientId: s.clientId, access: j.access_token, refresh: j.refresh_token || s.refresh,
    expires: Date.now() + j.expires_in * 1000,
  };
  await bridge.setSecret(next);
  return next;
}
