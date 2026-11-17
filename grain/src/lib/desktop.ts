/* Интеграция с ОС: Media Session (SMTC в Windows), кнопки на миниатюре панели задач, трей, уведомления. */
import { bridge, isDesktop } from './bridge';
import { controls, player, positionNow } from './player';
import { settings } from './settings';
import { img, artistsLine } from './types';

function drawIcon(kind: 'play' | 'pause' | 'prev' | 'next') {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.beginPath();
  if (kind === 'play') { g.moveTo(10, 7); g.lineTo(25, 16); g.lineTo(10, 25); g.closePath(); g.fill(); }
  if (kind === 'pause') { g.fillRect(9, 7, 5, 18); g.fillRect(18, 7, 5, 18); }
  if (kind === 'next') { g.moveTo(8, 8); g.lineTo(20, 16); g.lineTo(8, 24); g.closePath(); g.fill(); g.fillRect(21, 8, 3, 16); }
  if (kind === 'prev') { g.moveTo(24, 8); g.lineTo(12, 16); g.lineTo(24, 24); g.closePath(); g.fill(); g.fillRect(8, 8, 3, 16); }
  return c.toDataURL('image/png');
}

export function initDesktop() {
  const icons = { play: drawIcon('play'), pause: drawIcon('pause'), prev: drawIcon('prev'), next: drawIcon('next') };
  const ms = 'mediaSession' in navigator ? navigator.mediaSession : null;
  if (ms) {
    const h: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => !player.get().playing && controls.toggle()],
      ['pause', () => player.get().playing && controls.toggle()],
      ['nexttrack', () => controls.next()],
      ['previoustrack', () => controls.prev()],
      ['seekto', (d) => d.seekTime != null && controls.seek(d.seekTime * 1000)],
    ];
    for (const [a, fn] of h) { try { ms.setActionHandler(a, fn); } catch {} }
  }

  let lastUri = '';
  let lastPlaying: boolean | null = null;
  player.subscribe(() => {
    const s = player.get();
    const t = s.track;
    if (t && t.uri !== lastUri) {
      const first = !lastUri;
      lastUri = t.uri;
      if (ms) {
        ms.metadata = new MediaMetadata({
          title: t.name, artist: artistsLine(t.artists), album: t.album?.name ?? '',
          artwork: (t.album?.images ?? []).map((i) => ({ src: i.url, sizes: `${i.width ?? 300}x${i.height ?? 300}`, type: 'image/jpeg' })),
        });
      }
      if (!first && settings.get().notify && !document.hasFocus() && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification(t.name, { body: artistsLine(t.artists), icon: img(t.album?.images, 200), silent: true }); } catch {}
      }
      sendNow();
    }
    if (s.playing !== lastPlaying) {
      lastPlaying = s.playing;
      if (ms) ms.playbackState = s.playing ? 'playing' : 'paused';
      bridge.thumbar({ playing: s.playing, icons });
      sendNow();
    }
  });

  function sendNow() {
    const s = player.get();
    bridge.nowPlaying(s.track ? {
      title: s.track.name, artist: artistsLine(s.track.artists), playing: s.playing,
      progress: s.duration ? positionNow(s) / s.duration : undefined,
    } : null);
  }
  // прогресс трека на кнопке в панели задач
  if (isDesktop) setInterval(() => { if (player.get().playing) sendNow(); }, 3000);

  bridge.onMedia((cmd) => {
    if (cmd === 'toggle') controls.toggle();
    else if (cmd === 'next') controls.next();
    else if (cmd === 'prev') controls.prev();
    else if (cmd === 'volup') controls.setVolume(player.get().volume + 5);
    else if (cmd === 'voldown') controls.setVolume(player.get().volume - 5);
    else if (cmd === 'like') controls.toggleLike();
  });
}
