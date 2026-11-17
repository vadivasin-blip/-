import { settings, type ThemeMode } from './settings';
import { useStore } from './store';

/** Праздничный сезон: с 1 декабря по 14 января. */
export function isHolidaySeason(d = new Date()) {
  const m = d.getMonth(), day = d.getDate();
  return m === 11 || (m === 0 && day <= 14);
}

export const resolveTheme = (mode: ThemeMode) => (mode === 'auto' ? (isHolidaySeason() ? 'winter' : 'classic') : mode);

export function useTheme() {
  const mode = useStore(settings, (s) => s.theme);
  return resolveTheme(mode);
}

/** Ближайшая полночь 1 января (если сейчас первые часы января — уже наступил). */
export function nextNewYear(now = new Date()) {
  return new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
}

export function countdownParts(now = Date.now()) {
  const target = nextNewYear(new Date(now));
  const ms = target.getTime() - now;
  const s = Math.max(0, Math.floor(ms / 1000));
  return { year: target.getFullYear(), days: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, ms };
}
