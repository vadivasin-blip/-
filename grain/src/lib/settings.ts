import { createStore } from './store';

export type ThemeMode = 'classic' | 'winter' | 'auto';
export type Settings = {
  clientId: string;
  accentMode: 'cover' | 'fixed';
  accent: string;
  notify: boolean;
  closeToTray: boolean;
  globalHotkeys: boolean;
  grain: boolean;
  compactRows: boolean;
  lyricsSize: 'm' | 'l' | 'xl';
  theme: ThemeMode;
  snow: boolean;
  snowLevel: 1 | 2 | 3;
  garland: boolean;
  drift: boolean;
  countdown: boolean;
  spin: boolean;
  playback: 'auto' | 'spotify';
};

const defaults: Settings = {
  clientId: '',
  accentMode: 'cover',
  accent: '#e8a24a',
  notify: false,
  closeToTray: false,
  globalHotkeys: true,
  grain: true,
  compactRows: false,
  lyricsSize: 'l',
  theme: 'winter',
  snow: true,
  snowLevel: 2,
  garland: true,
  drift: true,
  countdown: true,
  spin: true,
  playback: 'auto',
};

let saved: Partial<Settings> = {};
try { saved = JSON.parse(localStorage.getItem('grain.settings') || '{}'); } catch {}

export const settings = createStore<Settings>({ ...defaults, ...saved });
settings.subscribe(() => localStorage.setItem('grain.settings', JSON.stringify(settings.get())));

export const ACCENTS = ['#e8a24a', '#d9694a', '#7fb58a', '#7aa6d8', '#c79bd6', '#f1e6d3'];
