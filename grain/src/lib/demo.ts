/* Демо-данные: интерфейс без аккаунта Spotify (запуск с ?demo). Все исполнители выдуманы. */
import type { Album, Artist, Playlist, Track } from './types';

const PALETTE = [
  ['#2b3a2f', '#d8c08a'], ['#3b1f1a', '#e07b4f'], ['#1d2733', '#8fb3d9'], ['#2e2a24', '#efe6d2'],
  ['#3a2236', '#d79bc7'], ['#1f2f2c', '#7fc2a8'], ['#402a12', '#f0b24a'], ['#18181b', '#e4e4e7'],
  ['#2a1f3d', '#a99be0'], ['#33281f', '#c9a27e'], ['#14323a', '#5fd0d6'], ['#3d1d1d', '#f2a3a3'],
];

function cover(seed: number, label: string) {
  const [bg, fg] = PALETTE[seed % PALETTE.length];
  const k = seed % 4;
  const shapes = [
    `<circle cx="150" cy="150" r="92" fill="none" stroke="${fg}" stroke-width="2"/><circle cx="150" cy="150" r="58" fill="${fg}" opacity=".85"/>`,
    Array.from({ length: 9 }, (_, i) => `<rect x="0" y="${i * 34}" width="300" height="${6 + (i % 3) * 5}" fill="${fg}" opacity="${0.25 + (i % 4) * 0.18}"/>`).join(''),
    `<path d="M0 230 Q75 120 150 190 T300 140 V300 H0Z" fill="${fg}" opacity=".9"/><circle cx="214" cy="84" r="30" fill="${fg}"/>`,
    `<rect x="54" y="54" width="192" height="192" fill="none" stroke="${fg}" stroke-width="3"/><rect x="96" y="96" width="108" height="108" fill="${fg}" opacity=".8"/>`,
  ][k];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="${bg}"/>${shapes}<text x="18" y="282" font-family="Arial" font-size="15" font-weight="700" fill="${fg}" letter-spacing="2">${label.toUpperCase().slice(0, 22).replace(/&/g, '&amp;')}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const ARTISTS = ['Северный Свет', 'Mira Holm', 'Тёплый Ламповый', 'Okada Lane', 'Полынь', 'The Quiet Ferry', 'Дом у Реки', 'Vesna Kolar', 'Low Orchard', 'Кассета'];
const ALBUMS: [string, number, string][] = [
  ['Ночная смена', 0, '2024'], ['Glass Weather', 1, '2023'], ['Плёнка', 2, '2022'], ['Salt & Static', 3, '2025'],
  ['Степь', 4, '2021'], ['Harbour Lights', 5, '2024'], ['Летний сад', 6, '2020'], ['Paper Moons', 7, '2023'],
  ['Small Hours', 8, '2025'], ['Сторона Б', 9, '2019'], ['Тихий час', 0, '2026'], ['Ferns', 1, '2026'],
];
const TITLES = ['Огни на воде', 'Slow Bloom', 'Пустые вагоны', 'Northbound', 'Сквозняк', 'Wires', 'Утро без тебя', 'Dust Choir',
  'Медленный танец', 'Halflight', 'Вторник', 'Paper Planes', 'Ржавчина', 'Undertow', 'Зеркала', 'Lanterns', 'Шёпот', 'Driftwood',
  'Последний трамвай', 'Kite Season', 'Стекло', 'Tidal', 'Ноябрь', 'Low Sun', 'Перрон', 'Orchard Road', 'Сирень', 'Static Bloom',
  'Город спит', 'Weathervane', 'Сигнал', 'Blue Hour', 'Обратный билет', 'Copper', 'Метель', 'Afterglow'];

const artistObj = (i: number): Artist => ({ id: `ar${i}`, name: ARTISTS[i], uri: `spotify:artist:ar${i}`, images: [{ url: cover(i + 3, ARTISTS[i]), width: 300, height: 300 }], genres: ['indie', 'dream pop'] });
const albumObj = (i: number): Album => {
  const [name, a, y] = ALBUMS[i];
  return { id: `al${i}`, name, uri: `spotify:album:al${i}`, images: [{ url: cover(i, name), width: 300, height: 300 }], release_date: `${y}-03-14`, album_type: i % 5 === 3 ? 'single' : 'album', artists: [artistObj(a)], total_tracks: 9, label: 'Grain Records' } as Album;
};
const TRACKS: Track[] = TITLES.map((name, i) => {
  const al = albumObj(i % ALBUMS.length);
  const feat = i % 7 === 2 ? [artistObj((ALBUMS[i % ALBUMS.length][1] + 3) % ARTISTS.length)] : [];
  return { id: `tr${i}`, uri: `spotify:track:tr${i}`, name, duration_ms: 142000 + ((i * 37919) % 160000), explicit: i % 9 === 4, artists: [...al.artists!, ...feat], album: al, track_number: (i % 9) + 1 };
});
const PLAYLISTS: Playlist[] = ['Для дороги', 'Late Night Focus', 'Осень 2026', 'Тёплое', 'Gym, honestly', 'Без слов', 'Найдено в ноябре', 'Shared w/ Lena'].map((name, i) => ({
  id: `pl${i}`, uri: `spotify:playlist:pl${i}`, name, description: i === 1 ? 'Тихое, ровное, без резких поворотов. Для работы допоздна.' : '',
  images: [{ url: cover(i + 5, name), width: 300, height: 300 }], owner: { id: i === 7 ? 'lena' : 'me', display_name: i === 7 ? 'Лена' : 'Вадим' }, items: { total: 12 + i * 3 },
}));
const plRows = (i: number) => Array.from({ length: 12 + i * 3 }, (_, k) => TRACKS[(k * 5 + i * 3) % TRACKS.length]);

const page = <T>(items: T[], offset = 0, limit = 50) => ({ items: items.slice(offset, offset + limit), total: items.length, offset, limit, next: offset + limit < items.length ? 'more' : null });

let st = { idx: 3, playing: true, progress: 61000, at: Date.now(), shuffle: false, repeat: 'off', volume: 64, list: TRACKS.map((t) => t.uri), ctx: 'spotify:playlist:pl1' as string | null };
const cur = () => TRACKS.find((t) => t.uri === st.list[st.idx]) ?? TRACKS[0];
const prog = () => Math.min(cur().duration_ms, st.progress + (st.playing ? Date.now() - st.at : 0));

export async function demoRequest(method: string, path: string, q: Record<string, any>, body: any): Promise<any> {
  await new Promise((r) => setTimeout(r, 60));
  const m = (re: RegExp) => path.match(re);
  let x: RegExpMatchArray | null;
  if (method === 'GET') {
    if (path === '/me') return { id: 'me', display_name: 'Вадим', images: [] };
    if (path === '/me/playlists') return page(PLAYLISTS, Number(q.offset || 0));
    if ((x = m(/^\/playlists\/(\w+)$/))) return PLAYLISTS.find((p) => p.id === x![1]);
    if ((x = m(/^\/playlists\/pl(\d+)\/items$/))) return page(plRows(+x[1]).map((t, k) => ({ added_at: new Date(Date.now() - k * 86400e3 * 3.3).toISOString(), item: t })), Number(q.offset || 0), 100);
    if (path === '/me/tracks') return page(TRACKS.slice(0, 28).map((t, k) => ({ added_at: new Date(Date.now() - k * 86400e3 * 1.7).toISOString(), track: t })), Number(q.offset || 0));
    if (path === '/me/albums') return page(ALBUMS.slice(0, 8).map((_, i) => ({ added_at: '', album: albumObj(i) })));
    if (path === '/me/following') return { artists: { ...page(ARTISTS.map((_, i) => artistObj(i))), cursors: {} } };
    if ((x = m(/^\/albums\/al(\d+)$/))) {
      const al = albumObj(+x[1]);
      const tr = TRACKS.filter((t) => t.album.id === al.id);
      const extra = TRACKS.slice(0, 9 - tr.length).map((t, k) => ({ ...t, id: `${t.id}x${x![1]}`, uri: `${t.uri}x${x![1]}`, album: al, artists: al.artists!, track_number: tr.length + k + 1 }));
      return { ...al, tracks: page([...tr, ...extra]) };
    }
    if ((x = m(/^\/artists\/ar(\d+)$/))) return artistObj(+x[1]);
    if ((x = m(/^\/artists\/ar(\d+)\/albums$/))) return page(ALBUMS.map((_, i) => albumObj(i)).filter((a) => a.artists![0].id === `ar${x![1]}`).concat(albumObj(10)));
    if (path === '/search') {
      const s = String(q.q || '').toLowerCase().replace(/artist:"?([^"]*)"?/, '$1');
      const hit = (n: string) => n.toLowerCase().includes(s) || s.length < 2;
      return {
        tracks: page(TRACKS.filter((t) => hit(t.name) || t.artists.some((a) => hit(a.name))), 0, Number(q.limit || 10)),
        artists: page(ARTISTS.map((_, i) => artistObj(i)).filter((a) => hit(a.name)), 0, 10),
        albums: page(ALBUMS.map((_, i) => albumObj(i)).filter((a) => hit(a.name) || hit(a.artists![0].name)), 0, 10),
        playlists: page(PLAYLISTS.filter((p) => hit(p.name)), 0, 10),
      };
    }
    if (path === '/me/top/tracks') return page(q.time_range === 'short_term' ? [...TRACKS].reverse() : TRACKS, 0, Number(q.limit || 50));
    if (path === '/me/top/artists') return page(ARTISTS.map((_, i) => artistObj(i)).sort((a, b) => (q.time_range === 'long_term' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id))));
    if (path === '/me/player/recently-played') return { items: TRACKS.slice(0, 20).map((t, k) => ({ track: t, played_at: new Date(Date.now() - k * 4e6).toISOString(), context: k % 3 ? { uri: PLAYLISTS[k % 8].uri, type: 'playlist' } : { uri: t.album.uri, type: 'album' } })) };
    if (path === '/me/player') {
      if (prog() >= cur().duration_ms) { st.idx = (st.idx + 1) % st.list.length; st.progress = 0; st.at = Date.now(); }
      return { device: { id: 'pc', name: 'Grain', type: 'Computer', is_active: true, volume_percent: st.volume }, item: cur(), is_playing: st.playing, progress_ms: prog(), shuffle_state: st.shuffle, repeat_state: st.repeat, context: st.ctx ? { uri: st.ctx } : null };
    }
    if (path === '/me/player/queue') return { currently_playing: cur(), queue: st.list.slice(st.idx + 1, st.idx + 15).map((u) => TRACKS.find((t) => t.uri === u)).filter(Boolean) };
    if (path === '/me/player/devices') return { devices: [
      { id: 'pc', name: 'Grain', type: 'Computer', is_active: true, volume_percent: st.volume },
      { id: 'ph', name: 'iPhone', type: 'Smartphone', is_active: false, volume_percent: 100 },
      { id: 'sp', name: 'Колонка на кухне', type: 'Speaker', is_active: false, volume_percent: 40 },
    ] };
    if (path.startsWith('/me/library') || path.endsWith('/contains')) return String(q.uris || q.ids || '').split(',').map((u) => /tr(1|4|7|9|12|15|20)$/.test(u) || u.includes('ar'));
  }
  const snap = () => { st.progress = prog(); st.at = Date.now(); };
  if (path === '/me/player/play') {
    snap();
    if (body?.uris) { st.list = body.uris; st.ctx = null; st.idx = Math.max(0, body.offset?.uri ? st.list.indexOf(body.offset.uri) : 0); st.progress = 0; }
    else if (body?.context_uri) {
      st.ctx = body.context_uri;
      const id = body.context_uri.split(':').pop();
      const list = id.startsWith('pl') ? plRows(+id.slice(2)) : id.startsWith('al') ? TRACKS.filter((t) => t.album.id === id) : TRACKS;
      st.list = (list.length ? list : TRACKS).map((t) => t.uri);
      st.idx = Math.max(0, body.offset?.uri ? st.list.indexOf(body.offset.uri) : body.offset?.position ?? 0); st.progress = 0;
    }
    st.playing = true; return;
  }
  if (path === '/me/player/pause') { snap(); st.playing = false; return; }
  if (path === '/me/player/next') { st.idx = (st.idx + 1) % st.list.length; st.progress = 0; st.at = Date.now(); return; }
  if (path === '/me/player/previous') { st.idx = Math.max(0, st.idx - 1); st.progress = 0; st.at = Date.now(); return; }
  if (path === '/me/player/seek') { st.progress = Number(q.position_ms); st.at = Date.now(); return; }
  if (path === '/me/player/volume') { st.volume = Number(q.volume_percent); return; }
  if (path === '/me/player/shuffle') { st.shuffle = q.state === true || q.state === 'true'; return; }
  if (path === '/me/player/repeat') { st.repeat = q.state; return; }
  if (path === '/me/player/queue') { st.list.splice(st.idx + 1, 0, q.uri); return; }
  return {};
}

export const DEMO_LRC = [
  [0, ''], [9000, 'Фонари на воде качаются в такт'], [14500, 'Кто-то оставил свет на втором этаже'], [20500, 'Я считаю мосты, как считают до ста'],
  [26800, 'И не помню уже, где тот город, где мы'], [33000, ''], [36500, 'Медленно, медленно'], [40200, 'Ночь разворачивает карту'],
  [46000, 'Все дороги ведут туда, где ты'], [52500, 'Ещё не спишь'], [58200, 'Огни на воде'], [62400, 'Огни на воде'],
  [66800, 'Я держу их в ладонях, пока не погаснут'], [73400, 'Тихо, как будто бы кто-то зовёт'], [80000, 'Из-под моста'], [86000, ''],
  [92000, 'Фонари на воде качаются в такт'], [98000, 'Это просто ноябрь, это просто так'], [104000, 'Медленно, медленно'], [110000, 'Огни на воде'],
] as [number, string][];
