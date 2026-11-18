/* Интеграция с ОС: Media Session (SMTC в Windows), кнопки на миниатюре панели задач, трей, уведомления. */
import { bridge, isDesktop } from './bridge';
import { controls, player, positionNow, sleep, type Repeat } from './player';
import { settings, type ThemeMode } from './settings';
import { resolveTheme } from './season';
import { ui } from './ui';
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
    const s = player.get(), st = settings.get();
    const pos = positionNow(s);
    bridge.nowPlaying({
      title: s.track?.name, artist: s.track ? artistsLine(s.track.artists) : undefined, cover: img(s.track?.album?.images, 300),
      playing: s.playing, progress: s.duration ? pos / s.duration : undefined, position: pos, duration: s.duration,
      liked: !!s.liked, shuffle: s.shuffle, repeat: s.repeat, volume: s.volume, muted: s.muted,
      sleep: s.sleepAt ? Math.max(1, Math.round((s.sleepAt - Date.now()) / 60000)) : s.sleepEndOfTrack ? 'track' : null,
      theme: st.theme, snow: st.snow, accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    });
  }
  // трей и мини-панель узнают о любых изменениях: лайк, повтор, громкость, таймер, тема
  let sig = '';
  const changed = () => {
    const s = player.get(), st = settings.get();
    const k = [s.liked, s.shuffle, s.repeat, s.volume, s.muted, s.sleepAt, s.sleepEndOfTrack, st.theme, st.snow, resolveTheme(st.theme)].join('|');
    if (k !== sig) { sig = k; sendNow(); }
  };
  player.subscribe(changed);
  settings.subscribe(changed);
  // при перемотке мини-панель должна сразу узнать новую позицию
  let lastPos = 0;
  player.subscribe(() => { const p = player.get().position; if (Math.abs(p - lastPos) > 1500) { lastPos = p; sendNow(); } else lastPos = p; });
  // прогресс трека на кнопке в панели задач
  if (isDesktop) setInterval(() => { if (player.get().playing) sendNow(); }, 3000);

  bridge.onMedia((cmd) => {
    if (cmd === 'toggle') controls.toggle();
    else if (cmd === 'next') controls.next();
    else if (cmd === 'prev') controls.prev();
    else if (cmd === 'volup') controls.setVolume(player.get().volume + 5);
    else if (cmd === 'voldown') controls.setVolume(player.get().volume - 5);
    else if (cmd === 'like') controls.toggleLike();
    else if (cmd === 'shuffle') controls.toggleShuffle();
    else if (cmd.startsWith('repeat:')) setRepeat(cmd.slice(7) as Repeat);
    else if (cmd.startsWith('vol:')) controls.setVolume(Number(cmd.slice(4)));
    else if (cmd === 'mute') controls.toggleMute();
    else if (cmd.startsWith('seek:')) controls.seek(Number(cmd.slice(5)));
    else if (cmd.startsWith('sleep:')) { const v = cmd.slice(6); sleep.set(v === 'off' ? null : v === 'track' ? 'track' : Number(v)); }
    else if (cmd.startsWith('theme:')) settings.set({ theme: cmd.slice(6) as ThemeMode });
    else if (cmd === 'snow') settings.set({ snow: !settings.get().snow });
    else if (cmd === 'lyrics') ui.set({ fullscreen: true });
  });
  // повтор ставим нужный режим, проходя цикл выкл → список → трек
  async function setRepeat(mode: Repeat) {
    for (let i = 0; i < 3 && player.get().repeat !== mode; i++) await controls.cycleRepeat();
  }
}
