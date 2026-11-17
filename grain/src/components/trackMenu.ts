import { api } from '../lib/spotify';
import { controls, likeStore, likes } from '../lib/player';
import { copy, openMenu, router, shareUrl, toast, ui, type MenuItem } from '../lib/ui';
import { bridge } from '../lib/bridge';
import { invalidate } from '../lib/useAsync';
import type { Track } from '../lib/types';

export type TrackCtx = { playlistId?: string; own?: boolean; onRemoved?: (uri: string) => void; play?: () => void };

export function trackMenuItems(t: Track, ctx: TrackCtx = {}): MenuItem[] {
  const liked = likeStore.get().map[t.uri];
  const items: MenuItem[] = [];
  if (ctx.play) items.push({ label: 'Играть', hint: 'Enter', run: ctx.play });
  items.push(
    { label: 'Добавить в очередь', hint: 'Q', run: () => controls.enqueue(t) },
    { sep: true },
    { label: liked ? 'Убрать из «Любимых»' : 'Добавить в «Любимые»', hint: 'L', run: () => likes.toggle(t.uri) },
    { label: 'Добавить в плейлист…', run: () => ui.set({ addTo: { uris: [t.uri], label: t.name } }) },
  );
  if (ctx.playlistId && ctx.own) {
    items.push({
      label: 'Убрать из этого плейлиста', danger: true,
      run: async () => {
        try {
          await api.removeFromPlaylist(ctx.playlistId!, [t.uri]);
          invalidate(`pl:${ctx.playlistId}`);
          ctx.onRemoved?.(t.uri);
          toast(`«${t.name}» убран из плейлиста`);
        } catch (e) { toast(`Не удалось: ${(e as Error).message}`); }
      },
    });
  }
  items.push({ sep: true });
  if (t.album?.id) items.push({ label: 'Перейти к альбому', run: () => router.go({ name: 'album', id: t.album.id }) });
  for (const a of (t.artists ?? []).slice(0, 3)) {
    if (a.id) items.push({ label: t.artists.length > 1 ? `Исполнитель: ${a.name}` : 'Перейти к исполнителю', run: () => router.go({ name: 'artist', id: a.id }) });
  }
  items.push(
    { sep: true },
    { label: 'Скопировать ссылку', run: () => copy(shareUrl(t.uri)) },
    { label: 'Скопировать «Исполнитель — Трек»', run: () => copy(`${t.artists.map((a) => a.name).join(', ')} — ${t.name}`, 'Скопировано') },
    { label: 'Открыть в Spotify', run: () => bridge.openExternal(shareUrl(t.uri)) },
  );
  return items;
}

export const showTrackMenu = (e: React.MouseEvent, t: Track, ctx?: TrackCtx) => openMenu(e, trackMenuItems(t, ctx));
