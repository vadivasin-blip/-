import { router } from '../lib/ui';
import { libraryStore } from '../lib/library';

export function contextLabel(uri: string): { label: string; go: () => void } {
  const [, kind, id, extra] = uri.split(':');
  if (kind === 'playlist') {
    const pl = libraryStore.get().playlists.find((p) => p.id === id);
    return { label: pl ? pl.name : 'Плейлист', go: () => router.go({ name: 'playlist', id }) };
  }
  if (kind === 'album') return { label: 'Альбом', go: () => router.go({ name: 'album', id }) };
  if (kind === 'artist') return { label: 'Исполнитель', go: () => router.go({ name: 'artist', id }) };
  if (kind === 'user' && (extra === 'collection' || uri.endsWith(':collection'))) return { label: 'Любимые треки', go: () => router.go({ name: 'liked' }) };
  return { label: 'Spotify', go: () => {} };
}
