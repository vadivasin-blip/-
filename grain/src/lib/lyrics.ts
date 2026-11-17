import type { Track } from './types';

export type Line = { t: number; text: string };
export type Lyrics = { synced: Line[] | null; plain: string | null; instrumental: boolean; source?: string };

const cache = new Map<string, Promise<Lyrics | null>>();
const STORE = 'grain.lyrics.v1';
let disk: Record<string, Lyrics | null> = {};
try { disk = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch {}
const saveDisk = () => {
  const keys = Object.keys(disk);
  if (keys.length > 300) keys.slice(0, keys.length - 300).forEach((k) => delete disk[k]);
  try { localStorage.setItem(STORE, JSON.stringify(disk)); } catch {}
};

export function parseLrc(lrc: string): Line[] {
  const out: Line[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const tags = [...raw.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!tags.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of tags) {
      const frac = m[3] ? Number(m[3].padEnd(3, '0')) : 0;
      out.push({ t: Number(m[1]) * 60000 + Number(m[2]) * 1000 + frac, text });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

const clean = (s: string) => s.replace(/\s*[-–(].*(remaster|version|edit|mix|live|mono|stereo|feat\.?|ft\.).*$/i, '').trim();

async function fetchLyrics(t: Track): Promise<Lyrics | null> {
  const artist = t.artists[0]?.name ?? '';
  const dur = Math.round(t.duration_ms / 1000);
  const toLyrics = (j: any): Lyrics => ({
    synced: j.syncedLyrics ? parseLrc(j.syncedLyrics) : null,
    plain: j.plainLyrics ?? null,
    instrumental: !!j.instrumental,
    source: 'LRCLIB',
  });
  try {
    const q = new URLSearchParams({ artist_name: artist, track_name: t.name, album_name: t.album?.name ?? '', duration: String(dur) });
    const r = await fetch(`https://lrclib.net/api/get?${q}`);
    if (r.ok) return toLyrics(await r.json());
  } catch {}
  try {
    const q = new URLSearchParams({ track_name: clean(t.name), artist_name: artist });
    const r = await fetch(`https://lrclib.net/api/search?${q}`);
    if (r.ok) {
      const list: any[] = await r.json();
      const best = list
        .filter((x) => Math.abs((x.duration ?? dur) - dur) <= 4)
        .sort((a, b) => Number(!!b.syncedLyrics) - Number(!!a.syncedLyrics))[0];
      if (best) return toLyrics(best);
    }
  } catch {}
  return null;
}

export function getLyrics(t: Track): Promise<Lyrics | null> {
  const key = t.id || t.uri;
  if (key in disk) return Promise.resolve(disk[key]);
  if (!cache.has(key)) {
    cache.set(key, fetchLyrics(t).then((l) => {
      disk[key] = l; saveDisk(); return l;
    }).catch(() => { cache.delete(key); return null; }));
  }
  return cache.get(key)!;
}

/** Сдвиг синхронизации по трекам (мс), пользователь подправляет вручную. */
export const offsets = {
  get(id: string) { return Number(localStorage.getItem(`grain.lyroff.${id}`) || 0); },
  set(id: string, v: number) { v ? localStorage.setItem(`grain.lyroff.${id}`, String(v)) : localStorage.removeItem(`grain.lyroff.${id}`); },
};

export function demoLyrics(lines: [number, string][]): Lyrics {
  return { synced: lines.map(([t, text]) => ({ t, text })), plain: null, instrumental: false, source: 'демо' };
}
