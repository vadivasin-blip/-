import { createStore } from './store';

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
};

const defaults: Settings = {
  clientId: '',
  accentMode: 'cover',
  accent: '#e3a548',
  notify: false,
  closeToTray: false,
  globalHotkeys: true,
  grain: true,
  compactRows: false,
  lyricsSize: 'l',
};

let saved: Partial<Settings> = {};
try { saved = JSON.parse(localStorage.getItem('grain.settings') || '{}'); } catch {}

export const settings = createStore<Settings>({ ...defaults, ...saved });
settings.subscribe(() => localStorage.setItem('grain.settings', JSON.stringify(settings.get())));

export const ACCENTS = ['#e3a548', '#d9694a', '#7fb58a', '#7aa6d8', '#c79bd6', '#e8e1d4'];
