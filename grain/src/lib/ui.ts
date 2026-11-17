import { createStore } from './store';
import type { Track } from './types';

// ── тосты ──
export type Toast = { id: number; text: string; action?: { label: string; run: () => void } };
export const toasts = createStore<{ list: Toast[] }>({ list: [] });
let tid = 0;
export function toast(text: string, action?: Toast['action']) {
  const id = ++tid;
  toasts.set((s) => ({ list: [...s.list.slice(-2), { id, text, action }] }));
  setTimeout(() => toasts.set((s) => ({ list: s.list.filter((t) => t.id !== id) })), action ? 6000 : 3200);
}

// ── маршрутизация ──
export type Route =
  | { name: 'home' } | { name: 'search'; q?: string } | { name: 'library'; tab?: string }
  | { name: 'liked' } | { name: 'stats' } | { name: 'settings' }
  | { name: 'playlist'; id: string } | { name: 'album'; id: string } | { name: 'artist'; id: string };

export const nav = createStore<{ stack: Route[]; index: number }>({ stack: [{ name: 'home' }], index: 0 });
export const route = () => { const s = nav.get(); return s.stack[s.index]; };
const scrolls = new Map<number, number>();
export const router = {
  go(r: Route) {
    const s = nav.get();
    const cur = s.stack[s.index];
    if (JSON.stringify(cur) === JSON.stringify(r)) return;
    scrolls.set(s.index, document.querySelector('.main-scroll')?.scrollTop ?? 0);
    const stack = [...s.stack.slice(0, s.index + 1), r].slice(-60);
    nav.set({ stack, index: stack.length - 1 });
    ui.set({ fullscreen: false });
  },
  replace(r: Route) {
    const s = nav.get();
    const stack = s.stack.slice(); stack[s.index] = r;
    nav.set({ stack });
  },
  back() { const s = nav.get(); if (s.index > 0) { scrolls.set(s.index, document.querySelector('.main-scroll')?.scrollTop ?? 0); nav.set({ index: s.index - 1 }); } },
  forward() { const s = nav.get(); if (s.index < s.stack.length - 1) nav.set({ index: s.index + 1 }); },
  savedScroll: (i: number) => scrolls.get(i) ?? 0,
};

// ── общее состояние интерфейса ──
export type Panel = 'now' | 'lyrics' | 'queue' | null;
const savedPanel = (['now', 'lyrics', 'queue'].includes(localStorage.getItem('grain.panel') || '') ? localStorage.getItem('grain.panel') : 'now') as Panel;
export const ui = createStore({
  panel: savedPanel,
  fullscreen: false,
  mini: false,
  palette: false,
  shortcuts: false,
  addTo: null as null | { uris: string[]; label: string },
  menu: null as null | { x: number; y: number; items: MenuItem[] },
});
ui.subscribe(() => localStorage.setItem('grain.panel', String(ui.get().panel)));

export type MenuItem =
  | { label: string; hint?: string; run: () => void; danger?: boolean; disabled?: boolean }
  | { sep: true };

export function openMenu(e: { clientX: number; clientY: number; preventDefault?: () => void }, items: MenuItem[]) {
  e.preventDefault?.();
  ui.set({ menu: { x: e.clientX, y: e.clientY, items } });
}

export function copy(text: string, msg = 'Ссылка скопирована') {
  navigator.clipboard.writeText(text).then(() => toast(msg)).catch(() => toast('Не удалось скопировать'));
}

export const shareUrl = (uri: string) => {
  const [, kind, id] = uri.split(':');
  return `https://open.spotify.com/${kind}/${id}`;
};

export const fmt = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

export const fmtLong = (ms: number) => {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  return `${h} ч ${min % 60} мин`;
};

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
  return `${n.toLocaleString('ru-RU')} ${w}`;
}

export const year = (d?: string) => (d ? d.slice(0, 4) : '');

export const dateAdded = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const days = (Date.now() - d.getTime()) / 864e5;
  if (days < 1) return 'сегодня';
  if (days < 2) return 'вчера';
  if (days < 7) return plural(Math.floor(days), 'день', 'дня', 'дней') + ' назад';
  if (days < 30) return plural(Math.floor(days / 7), 'неделю', 'недели', 'недель') + ' назад';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).replace(' г.', '');
};

export type TrackLike = Pick<Track, 'uri' | 'name'> & Partial<Track>;
