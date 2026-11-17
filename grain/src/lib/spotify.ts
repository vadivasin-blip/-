import { refreshSession, type Session } from './auth';
import { bridge } from './bridge';
import type { Album, Artist, Device, Paging, Playlist, Row, Track, User } from './types';

const BASE = 'https://api.spotify.com/v1';

let session: Session | null = null;
let refreshing: Promise<Session> | null = null;
let onLoggedOut: () => void = () => {};
let demoHandler: ((m: string, p: string, q: Record<string, any>, b: any) => Promise<any>) | null = null;

export class ApiError extends Error {
  constructor(public status: number, message: string, public reason?: string) { super(message); }
}

export const auth = {
  set(s: Session | null) { session = s; },
  get: () => session,
  onLoggedOut(fn: () => void) { onLoggedOut = fn; },
  useDemo(h: typeof demoHandler) { demoHandler = h; },
  isDemo: () => !!demoHandler,
  async logout() { session = null; await bridge.setSecret(null); onLoggedOut(); },
};

export async function token(): Promise<string> {
  if (demoHandler) return 'demo';
  if (!session) throw new ApiError(401, 'Нет сессии');
  if (Date.now() < session.expires - 60_000) return session.access;
  if (!refreshing) {
    refreshing = refreshSession(session)
      .then((s) => (session = s))
      .catch(async (e) => {
        if ((e as any).fatal) await auth.logout();
        throw e;
      })
      .finally(() => (refreshing = null));
  }
  return (await refreshing).access;
}

type Opts = { query?: Record<string, any>; body?: any; retry?: number };

export async function request<T = any>(method: string, path: string, opts: Opts = {}): Promise<T> {
  const q = Object.fromEntries(Object.entries(opts.query ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  if (demoHandler) return demoHandler(method, path, q, opts.body);
  const url = path.startsWith('http') ? new URL(path) : new URL(BASE + path);
  for (const [k, v] of Object.entries(q)) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await token()}`,
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const retry = opts.retry ?? 0;
  if (res.status === 429 && retry < 4) {
    const wait = Math.min(Number(res.headers.get('Retry-After') || 1), 20) * 1000;
    await new Promise((r) => setTimeout(r, wait + 150));
    return request(method, path, { ...opts, retry: retry + 1 });
  }
  if (res.status === 401 && retry < 1 && session) {
    session = { ...session, expires: 0 };
    return request(method, path, { ...opts, retry: retry + 1 });
  }
  if (res.status === 204 || res.status === 202) return undefined as T;
  const text = await res.text();
  let json: any = undefined;
  try { json = text ? JSON.parse(text) : undefined; } catch { /* not json */ }
  if (!res.ok) {
    const msg = json?.error?.message || json?.error_description || res.statusText || 'Ошибка запроса';
    throw new ApiError(res.status, msg, json?.error?.reason);
  }
  return json as T;
}

const get = <T = any>(p: string, query?: Record<string, any>) => request<T>('GET', p, { query });

/** Пробуем новый (2026) эндпоинт, при 404/403/400 — старый. */
async function either<T>(a: () => Promise<T>, b: () => Promise<T>): Promise<T> {
  try { return await a(); } catch (e) {
    if (e instanceof ApiError && [400, 403, 404, 405].includes(e.status)) return b();
    throw e;
  }
}

const normRow = (it: any, i: number): Row | null => {
  const track = it?.item ?? it?.track;
  if (!track || !track.uri) return null;
  return { track, added_at: it.added_at, key: `${track.uri}#${i}` };
};

/** Загрузить все страницы (с ограничением) — нужно для локального поиска и сортировки. */
export async function pageAll<T>(first: (offset: number) => Promise<Paging<T>>, max = 3000, onPage?: (items: T[], total: number) => void) {
  const out: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await first(offset);
    out.push(...page.items);
    onPage?.(out.slice(), page.total);
    offset += page.items.length;
    if (!page.next || !page.items.length || out.length >= max) break;
  }
  return out;
}

export const api = {
  me: () => get<User>('/me'),

  // ── медиатека ──
  myPlaylists: (offset = 0) => get<Paging<Playlist>>('/me/playlists', { limit: 50, offset }),
  playlist: (id: string) => get<Playlist>(`/playlists/${id}`, { fields: 'id,uri,name,description,images,owner(id,display_name),public,collaborative,snapshot_id,items(total),tracks(total)' })
    .catch(() => get<Playlist>(`/playlists/${id}`)),
  async playlistRows(id: string, offset = 0): Promise<Paging<Row>> {
    const page = await either(
      () => get<Paging<any>>(`/playlists/${id}/items`, { limit: 100, offset, additional_types: 'track,episode' }),
      () => get<Paging<any>>(`/playlists/${id}/tracks`, { limit: 100, offset, additional_types: 'track,episode' }),
    );
    return { ...page, items: page.items.map((it, i) => normRow(it, offset + i)).filter(Boolean) as Row[] };
  },
  async savedRows(offset = 0): Promise<Paging<Row>> {
    const page = await get<Paging<any>>('/me/tracks', { limit: 50, offset });
    return { ...page, items: page.items.map((it, i) => normRow(it, offset + i)).filter(Boolean) as Row[] };
  },
  savedAlbums: (offset = 0) => get<Paging<{ added_at: string; album: Album }>>('/me/albums', { limit: 50, offset }),
  followedArtists: (after?: string) => get<{ artists: Paging<Artist> & { cursors?: { after?: string } } }>('/me/following', { type: 'artist', limit: 50, after }),

  // ── каталог ──
  album: (id: string) => get<Album>(`/albums/${id}`),
  albumTracks: (id: string, offset = 0) => get<Paging<Omit<Track, 'album'>>>(`/albums/${id}/tracks`, { limit: 50, offset }),
  artist: (id: string) => get<Artist>(`/artists/${id}`),
  artistAlbums: (id: string, groups = 'album,single,compilation', offset = 0) =>
    get<Paging<Album>>(`/artists/${id}/albums`, { include_groups: groups, limit: 50, offset }),
  async search(q: string, types = 'track,artist,album,playlist', limit = 10, offset = 0) {
    const r = await get<any>('/search', { q, type: types, limit, offset });
    // Spotify иногда возвращает null внутри items — чистим.
    for (const k of Object.keys(r ?? {})) if (r[k]?.items) r[k].items = r[k].items.filter(Boolean);
    return r as {
      tracks?: Paging<Track>; artists?: Paging<Artist>; albums?: Paging<Album>; playlists?: Paging<Playlist>;
    };
  },
  top: <T = Track | Artist>(type: 'tracks' | 'artists', range: 'short_term' | 'medium_term' | 'long_term', limit = 50) =>
    get<Paging<T>>(`/me/top/${type}`, { time_range: range, limit }),
  recent: (limit = 50) => get<{ items: { track: Track; played_at: string; context: { uri: string; type: string } | null }[] }>('/me/player/recently-played', { limit }),

  // ── библиотека (2026: единый /me/library; фоллбек на старые пути) ──
  async contains(uris: string[]): Promise<boolean[]> {
    if (!uris.length) return [];
    return either(
      () => get<boolean[]>('/me/library/contains', { uris: uris.join(',') }),
      () => either(
        () => get<boolean[]>('/me/library', { uris: uris.join(',') }),
        () => {
          const kind = uris[0].split(':')[1];
          const ids = uris.map((u) => u.split(':')[2]).join(',');
          if (kind === 'artist') return get<boolean[]>('/me/following/contains', { type: 'artist', ids });
          if (kind === 'album') return get<boolean[]>('/me/albums/contains', { ids });
          return get<boolean[]>('/me/tracks/contains', { ids });
        },
      ),
    );
  },
  save: (uris: string[]) => either(
    () => request('PUT', '/me/library', { query: { uris: uris.join(',') }, body: {} }),
    () => legacyLibrary('PUT', uris),
  ),
  unsave: (uris: string[]) => either(
    () => request('DELETE', '/me/library', { query: { uris: uris.join(',') }, body: {} }),
    () => legacyLibrary('DELETE', uris),
  ),
  addToPlaylist: (id: string, uris: string[]) => either(
    () => request('POST', `/playlists/${id}/items`, { body: { uris } }),
    () => request('POST', `/playlists/${id}/tracks`, { body: { uris } }),
  ),
  removeFromPlaylist: (id: string, uris: string[]) => either(
    () => request('DELETE', `/playlists/${id}/items`, { body: { items: uris.map((uri) => ({ uri })) } }),
    () => request('DELETE', `/playlists/${id}/tracks`, { body: { tracks: uris.map((uri) => ({ uri })) } }),
  ),
  createPlaylist: (name: string, description = '') => either(
    () => request<Playlist>('POST', '/me/playlists', { body: { name, description, public: false } }),
    async () => request<Playlist>('POST', `/users/${(await api.me()).id}/playlists`, { body: { name, description, public: false } }),
  ),

  // ── плеер ──
  player: () => get<any>('/me/player', { additional_types: 'track,episode' }),
  devices: () => get<{ devices: Device[] }>('/me/player/devices'),
  queue: () => get<{ currently_playing: Track | null; queue: Track[] }>('/me/player/queue'),
  play: (deviceId: string | undefined, body?: { context_uri?: string; uris?: string[]; offset?: { uri?: string; position?: number }; position_ms?: number }) =>
    request('PUT', '/me/player/play', { query: { device_id: deviceId }, body: body ?? {} }),
  pause: (deviceId?: string) => request('PUT', '/me/player/pause', { query: { device_id: deviceId } }),
  next: (deviceId?: string) => request('POST', '/me/player/next', { query: { device_id: deviceId } }),
  prev: (deviceId?: string) => request('POST', '/me/player/previous', { query: { device_id: deviceId } }),
  seek: (ms: number, deviceId?: string) => request('PUT', '/me/player/seek', { query: { position_ms: Math.round(ms), device_id: deviceId } }),
  volume: (pct: number, deviceId?: string) => request('PUT', '/me/player/volume', { query: { volume_percent: Math.round(pct), device_id: deviceId } }),
  shuffle: (on: boolean, deviceId?: string) => request('PUT', '/me/player/shuffle', { query: { state: on, device_id: deviceId } }),
  repeat: (mode: 'off' | 'context' | 'track', deviceId?: string) => request('PUT', '/me/player/repeat', { query: { state: mode, device_id: deviceId } }),
  transfer: (deviceId: string, play = true) => request('PUT', '/me/player', { body: { device_ids: [deviceId], play } }),
  enqueue: (uri: string, deviceId?: string) => request('POST', '/me/player/queue', { query: { uri, device_id: deviceId } }),
};

function legacyLibrary(method: 'PUT' | 'DELETE', uris: string[]) {
  const kind = uris[0].split(':')[1];
  const ids = uris.map((u) => u.split(':')[2]);
  if (kind === 'artist') return request(method, '/me/following', { query: { type: 'artist', ids: ids.join(',') } });
  if (kind === 'playlist') return request(method, `/playlists/${ids[0]}/followers`, method === 'PUT' ? { body: {} } : {});
  if (kind === 'album') return request(method, '/me/albums', { query: { ids: ids.join(',') } });
  return request(method, '/me/tracks', { query: { ids: ids.join(',') } });
}
