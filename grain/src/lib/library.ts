import { api, pageAll } from './spotify';
import { createStore } from './store';
import type { Playlist, User } from './types';

/** Глобальные данные: пользователь и его плейлисты (для сайдбара, «добавить в плейлист», палитры). */
export const libraryStore = createStore<{ me: User | null; playlists: Playlist[]; loaded: boolean }>({ me: null, playlists: [], loaded: false });

export async function loadLibrary() {
  const [me, playlists] = await Promise.all([api.me(), pageAll((o) => api.myPlaylists(o), 1000)]);
  libraryStore.set({ me, playlists: playlists.filter(Boolean), loaded: true });
}

export async function reloadPlaylists() {
  const playlists = await pageAll((o) => api.myPlaylists(o), 1000);
  libraryStore.set({ playlists: playlists.filter(Boolean) });
}

export const isOwn = (p: Playlist) => p.owner?.id === libraryStore.get().me?.id || !!p.collaborative;
