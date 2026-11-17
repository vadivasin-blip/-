import { api, ApiError, auth, token } from './spotify';
import { createStore } from './store';
import type { Device, Track } from './types';
import { toast } from './ui';

export type Repeat = 'off' | 'context' | 'track';
export type PlayerState = {
  sdk: 'idle' | 'loading' | 'ready' | 'error';
  sdkError: string | null;
  sdkDeviceId: string | null;
  track: Track | null;
  playing: boolean;
  position: number;
  stamp: number;
  duration: number;
  shuffle: boolean;
  repeat: Repeat;
  volume: number;
  muted: boolean;
  device: Device | null;
  contextUri: string | null;
  liked: boolean | null;
  queue: Track[];
  sleepAt: number | null;
  sleepEndOfTrack: boolean;
};

const savedVol = Number(localStorage.getItem('grain.volume') ?? 70);

export const player = createStore<PlayerState>({
  sdk: 'idle', sdkError: null, sdkDeviceId: null,
  track: null, playing: false, position: 0, stamp: performance.now(), duration: 0,
  shuffle: false, repeat: 'off', volume: Number.isFinite(savedVol) ? savedVol : 70, muted: false,
  device: null, contextUri: null, liked: null, queue: [], sleepAt: null, sleepEndOfTrack: false,
});

export const positionNow = (s = player.get()) =>
  Math.max(0, Math.min(s.duration || Infinity, s.position + (s.playing ? performance.now() - s.stamp : 0)));

// ── Web Playback SDK ──────────────────────────────────────────────────────
let sdkPlayer: any = null;
const isLocal = () => {
  const s = player.get();
  return !!s.sdkDeviceId && (!s.device || s.device.id === s.sdkDeviceId);
};

const uriId = (uri?: string) => (uri ? uri.split(':').pop() || '' : '');
function fromSdkTrack(t: any): Track {
  return {
    id: t.id || uriId(t.uri), uri: t.uri, name: t.name, duration_ms: t.duration_ms, type: t.type,
    artists: (t.artists || []).map((a: any) => ({ id: uriId(a.uri), name: a.name, uri: a.uri })),
    album: { id: uriId(t.album?.uri), name: t.album?.name, uri: t.album?.uri, images: t.album?.images || [] },
  };
}

export function loadSdk() {
  if (auth.isDemo() || player.get().sdk !== 'idle') return;
  player.set({ sdk: 'loading' });
  (window as any).onSpotifyWebPlaybackSDKReady = () => {
    const P = (window as any).Spotify.Player;
    sdkPlayer = new P({
      name: 'Grain',
      getOAuthToken: (cb: (t: string) => void) => token().then(cb).catch(() => {}),
      volume: player.get().volume / 100,
    });
    const fail = (msg: string) => ({ message }: { message: string }) => {
      console.warn('[sdk]', msg, message);
      player.set({ sdk: 'error', sdkError: msg });
    };
    sdkPlayer.addListener('initialization_error', fail('Встроенное воспроизведение недоступно в этой сборке (нет Widevine). Музыка будет играть через приложение Spotify.'));
    sdkPlayer.addListener('authentication_error', fail('Spotify не принял токен для встроенного плеера. Попробуйте перезайти.'));
    sdkPlayer.addListener('account_error', fail('Встроенный плеер работает только с Spotify Premium.'));
    sdkPlayer.addListener('playback_error', ({ message }: any) => toast(`Ошибка воспроизведения: ${message}`));
    sdkPlayer.addListener('ready', ({ device_id }: any) => {
      player.set({ sdk: 'ready', sdkDeviceId: device_id, sdkError: null });
      // если сейчас ничего нигде не играет — делаем Grain активным устройством
      api.player().then((st) => {
        if (!st || !st.device) api.transfer(device_id, false).then(() => setTimeout(sync, 600)).catch(() => {});
      }).catch(() => {});
    });
    sdkPlayer.addListener('not_ready', () => player.set({ sdkDeviceId: null }));
    sdkPlayer.addListener('player_state_changed', (st: any) => {
      if (!st) return;
      const cur = st.track_window?.current_track;
      const s = player.get();
      player.set({
        track: cur ? fromSdkTrack(cur) : null,
        playing: !st.paused,
        position: st.position,
        stamp: performance.now(),
        duration: st.duration,
        shuffle: st.shuffle,
        repeat: (['off', 'context', 'track'] as Repeat[])[st.repeat_mode] ?? 'off',
        contextUri: st.context?.uri ?? null,
        device: s.device && s.device.id === s.sdkDeviceId ? s.device
          : { id: s.sdkDeviceId!, name: 'Grain', type: 'Computer', is_active: true, volume_percent: s.volume },
      });
    });
    sdkPlayer.connect().then((ok: boolean) => {
      if (!ok) player.set({ sdk: 'error', sdkError: 'Не удалось подключить встроенный плеер.' });
    });
  };
  const script = document.createElement('script');
  script.src = 'https://sdk.scdn.co/spotify-player.js';
  script.async = true;
  script.onerror = () => player.set({ sdk: 'error', sdkError: 'Не удалось загрузить Spotify SDK (нет сети?).' });
  document.head.appendChild(script);
}

/** Браузерные политики автозапуска: первый жест пользователя «будит» аудио SDK. */
export function activateElement() { try { sdkPlayer?.activateElement?.(); } catch {} }

// ── синхронизация с /me/player ─────────────────────────────────────────────
let syncTimer: number | undefined;
let lastSyncErr = 0;
export async function sync() {
  try {
    const st = await api.player();
    const s = player.get();
    if (!st) {
      if (!isLocal()) player.set({ device: null, playing: false });
      return;
    }
    // если играет встроенный плеер — его события точнее, берём из API только устройство
    const localActive = st.device?.id && st.device.id === s.sdkDeviceId;
    const patch: Partial<PlayerState> = { device: st.device ?? null };
    if (!localActive) {
      Object.assign(patch, {
        track: st.item ?? null,
        playing: !!st.is_playing,
        position: st.progress_ms ?? 0,
        stamp: performance.now(),
        duration: st.item?.duration_ms ?? 0,
        shuffle: !!st.shuffle_state,
        repeat: st.repeat_state ?? 'off',
        contextUri: st.context?.uri ?? null,
      });
      if (st.device?.volume_percent != null && !s.muted) patch.volume = st.device.volume_percent;
    }
    player.set(patch);
  } catch (e) {
    if (Date.now() - lastSyncErr > 60_000 && !(e instanceof ApiError && e.status === 401)) {
      lastSyncErr = Date.now();
      console.warn('sync', e);
    }
  }
}

export function startSync() {
  stopSync();
  const tick = async () => {
    await sync();
    const interval = document.hidden ? 12_000 : isLocal() ? 15_000 : 2_500;
    syncTimer = window.setTimeout(tick, interval);
  };
  tick();
}
export function stopSync() { if (syncTimer) clearTimeout(syncTimer); }

// ── команды ───────────────────────────────────────────────────────────────
const targetDevice = () => {
  const s = player.get();
  return s.device?.id ?? s.sdkDeviceId ?? undefined;
};

async function run(fn: () => Promise<any>, fallbackMsg = 'Не получилось') {
  try { await fn(); } catch (e) {
    if (e instanceof ApiError && e.status === 404) toast('Нет активного устройства. Откройте Spotify где-нибудь или дождитесь встроенного плеера.');
    else if (e instanceof ApiError && e.status === 403) toast(e.reason === 'PREMIUM_REQUIRED' ? 'Управление воспроизведением требует Spotify Premium.' : `${fallbackMsg}: ${e.message}`);
    else toast(`${fallbackMsg}: ${(e as Error).message}`);
    setTimeout(sync, 400);
  }
}

const optimistic = (patch: Partial<PlayerState>) => {
  player.set({ ...patch, position: positionNow(), stamp: performance.now() });
};

export const controls = {
  async playContext(contextUri: string, offset?: { uri?: string; position?: number }) {
    activateElement();
    await run(() => api.play(targetDevice(), { context_uri: contextUri, offset }), 'Не удалось включить');
    setTimeout(sync, 500);
  },
  async playUris(uris: string[], startUri?: string) {
    activateElement();
    const list = uris.slice(0, 700);
    await run(() => api.play(targetDevice(), { uris: list, offset: startUri ? { uri: startUri } : undefined }), 'Не удалось включить');
    setTimeout(sync, 500);
  },
  async toggle() {
    activateElement();
    const s = player.get();
    if (!s.track && !s.device) return toast('Нечего играть — выберите трек.');
    optimistic({ playing: !s.playing });
    if (isLocal() && sdkPlayer) return sdkPlayer.togglePlay();
    await run(() => (s.playing ? api.pause(targetDevice()) : api.play(targetDevice())));
  },
  async next() {
    activateElement();
    if (isLocal() && sdkPlayer) return sdkPlayer.nextTrack();
    await run(() => api.next(targetDevice()));
    setTimeout(sync, 350);
  },
  async prev() {
    activateElement();
    if (positionNow() > 3500) return controls.seek(0);
    if (isLocal() && sdkPlayer) return sdkPlayer.previousTrack();
    await run(() => api.prev(targetDevice()));
    setTimeout(sync, 350);
  },
  async seek(ms: number) {
    const s = player.get();
    const clamped = Math.max(0, Math.min(s.duration - 500, ms));
    player.set({ position: clamped, stamp: performance.now() });
    if (isLocal() && sdkPlayer) return sdkPlayer.seek(clamped);
    await run(() => api.seek(clamped, targetDevice()));
  },
  seekBy(deltaMs: number) { controls.seek(positionNow() + deltaMs); },
  setVolume: (() => {
    let t: number | undefined;
    return (v: number) => {
      const vol = Math.max(0, Math.min(100, Math.round(v)));
      player.set({ volume: vol, muted: false });
      localStorage.setItem('grain.volume', String(vol));
      if (isLocal() && sdkPlayer) { sdkPlayer.setVolume(vol / 100); return; }
      clearTimeout(t);
      t = window.setTimeout(() => run(() => api.volume(vol, targetDevice()), 'Громкость'), 180);
    };
  })(),
  toggleMute() {
    const s = player.get();
    if (s.muted) { controls.setVolume(Number(localStorage.getItem('grain.volume') ?? 70) || 50); return; }
    player.set({ muted: true });
    if (isLocal() && sdkPlayer) sdkPlayer.setVolume(0);
    else run(() => api.volume(0, targetDevice()));
  },
  async toggleShuffle() {
    const on = !player.get().shuffle;
    player.set({ shuffle: on });
    await run(() => api.shuffle(on, targetDevice()));
  },
  async cycleRepeat() {
    const order: Repeat[] = ['off', 'context', 'track'];
    const next = order[(order.indexOf(player.get().repeat) + 1) % 3];
    player.set({ repeat: next });
    await run(() => api.repeat(next, targetDevice()));
  },
  async transfer(id: string) {
    await run(() => api.transfer(id, player.get().playing), 'Не удалось переключить устройство');
    setTimeout(sync, 700);
  },
  async enqueue(t: { uri: string; name: string }) {
    await run(async () => { await api.enqueue(t.uri, targetDevice()); toast(`«${t.name}» — в очереди`); refreshQueue(); }, 'Не удалось добавить в очередь');
  },
  async toggleLike() {
    const s = player.get();
    if (!s.track) return;
    const want = !s.liked;
    player.set({ liked: want });
    try {
      await (want ? api.save([s.track.uri]) : api.unsave([s.track.uri]));
      likes.set(s.track.uri, want);
      toast(want ? 'Добавлено в «Любимые»' : 'Убрано из «Любимых»');
    } catch (e) {
      player.set({ liked: !want });
      toast(`Не удалось: ${(e as Error).message}`);
    }
  },
};

export async function refreshQueue() {
  try {
    const q = await api.queue();
    player.set({ queue: (q?.queue ?? []).filter(Boolean).slice(0, 50) });
  } catch { /* очередь — не критично */ }
}

// ── кэш «нравится» для строк треков ────────────────────────────────────────
export const likeStore = createStore<{ map: Record<string, boolean> }>({ map: {} });
const pendingLikes = new Set<string>();
let likeTimer: number | undefined;
export const likes = {
  set(uri: string, v: boolean) {
    likeStore.set((s) => ({ map: { ...s.map, [uri]: v } }));
    if (player.get().track?.uri === uri) player.set({ liked: v });
  },
  setMany(uris: string[], v: boolean) {
    likeStore.set((s) => { const m = { ...s.map }; uris.forEach((u) => (m[u] = v)); return { map: m }; });
  },
  want(uri: string) {
    if (uri in likeStore.get().map || !uri.startsWith('spotify:track:')) return;
    pendingLikes.add(uri);
    clearTimeout(likeTimer);
    likeTimer = window.setTimeout(flushLikes, 250);
  },
  async toggle(uri: string) {
    const was = !!likeStore.get().map[uri];
    likes.set(uri, !was);
    try { await (was ? api.unsave([uri]) : api.save([uri])); toast(was ? 'Убрано из «Любимых»' : 'Добавлено в «Любимые»'); }
    catch (e) { likes.set(uri, was); toast(`Не удалось: ${(e as Error).message}`); }
  },
};
async function flushLikes() {
  const known = likeStore.get().map;
  const all = [...pendingLikes].filter((u) => !(u in known));
  pendingLikes.clear();
  for (let i = 0; i < all.length; i += 40) {
    const chunk = all.slice(i, i + 40);
    try {
      const res = await api.contains(chunk);
      likeStore.set((s) => { const m = { ...s.map }; chunk.forEach((u, j) => { if (!(u in m)) m[u] = !!res[j]; }); return { map: m }; });
    } catch { break; }
  }
}

// ── реакция на смену трека ───────────────────────────────────────────────
let lastUri: string | null = null;
player.subscribe(() => {
  const s = player.get();
  const uri = s.track?.uri ?? null;
  if (uri === lastUri) return;
  const prevUri = lastUri;
  lastUri = uri;
  if (!uri) return;
  const known = likeStore.get().map[uri];
  player.set({ liked: known ?? null });
  if (known === undefined) api.contains([uri]).then(([v]) => { likes.set(uri, !!v); }).catch(() => {});
  refreshQueue();
  // таймер сна «до конца трека»
  if (prevUri && s.sleepEndOfTrack) {
    player.set({ sleepEndOfTrack: false });
    if (s.playing) controls.toggle();
    toast('Таймер сна: остановлено');
  }
});

// ── таймер сна ────────────────────────────────────────────────────────────
let sleepTimer: number | undefined;
export const sleep = {
  set(minutes: number | 'track' | null) {
    clearTimeout(sleepTimer);
    if (minutes === null) { player.set({ sleepAt: null, sleepEndOfTrack: false }); toast('Таймер сна выключен'); return; }
    if (minutes === 'track') { player.set({ sleepAt: null, sleepEndOfTrack: true }); toast('Остановлю после этого трека'); return; }
    const at = Date.now() + minutes * 60_000;
    player.set({ sleepAt: at, sleepEndOfTrack: false });
    sleepTimer = window.setTimeout(() => {
      player.set({ sleepAt: null });
      if (player.get().playing) controls.toggle();
      toast('Таймер сна: остановлено');
    }, minutes * 60_000);
    toast(`Остановлю через ${minutes} мин`);
  },
};
