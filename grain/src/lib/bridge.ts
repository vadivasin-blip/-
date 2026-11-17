export type GrainBridge = {
  getSecret: () => Promise<any>;
  setSecret: (v: any) => Promise<boolean>;
  getPrefs: () => Promise<{ closeToTray: boolean; globalHotkeys: boolean }>;
  setPrefs: (p: Partial<{ closeToTray: boolean; globalHotkeys: boolean }>) => Promise<any>;
  info: () => Promise<{ version: string; redirectUri: string; platform: string; widevine: boolean }>;
  openExternal: (url: string) => void;
  setMini: (on: boolean) => void;
  minimize: () => void;
  close: () => void;
  setFullscreen: (on: boolean) => void;
  toggleMax: () => void;
  isMaximized: () => Promise<boolean>;
  onWinState: (cb: (s: { maximized: boolean }) => void) => () => void;
  thumbar: (t: { playing: boolean; icons: Record<string, string> }) => void;
  nowPlaying: (info: { title?: string; artist?: string; playing: boolean; progress?: number } | null) => void;
  onAuth: (cb: (v: { code: string | null; state: string | null; error: string | null }) => void) => () => void;
  onMedia: (cb: (cmd: string) => void) => () => void;
  onNav: (cb: (dir: 'back' | 'forward') => void) => () => void;
  onMini: (cb: (on: boolean) => void) => () => void;
};

declare global { interface Window { grain?: GrainBridge } }

const noop = () => () => {};
/** В браузере (dev/демо) мост отсутствует — подставляем безопасные заглушки. */
export const bridge: GrainBridge = window.grain ?? {
  getSecret: async () => { try { return JSON.parse(localStorage.getItem('grain.secret') || 'null'); } catch { return null; } },
  setSecret: async (v) => { v == null ? localStorage.removeItem('grain.secret') : localStorage.setItem('grain.secret', JSON.stringify(v)); return true; },
  getPrefs: async () => ({ closeToTray: false, globalHotkeys: true }),
  setPrefs: async (p) => p,
  info: async () => ({ version: 'dev', redirectUri: 'http://127.0.0.1:43117/callback', platform: 'web', widevine: false }),
  openExternal: (url) => window.open(url, '_blank'),
  setMini: () => {}, minimize: () => {}, close: () => {}, setFullscreen: () => {}, toggleMax: () => {}, isMaximized: async () => false, onWinState: noop,
  thumbar: () => {}, nowPlaying: () => {},
  onAuth: noop, onMedia: noop, onNav: noop, onMini: noop,
};

export const isDesktop = !!window.grain;
