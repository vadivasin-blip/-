import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 18, p: P) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p,
});
const mk = (d: React.ReactNode, filled = false) => ({ size, ...p }: P) => (
  <svg {...base(size, p)} {...(filled ? { fill: 'currentColor', stroke: 'none' } : {})}>{d}</svg>
);

export const I = {
  play: mk(<path d="M7.5 4.8v14.4a.8.8 0 0 0 1.2.7l11.3-7.2a.8.8 0 0 0 0-1.4L8.7 4.1a.8.8 0 0 0-1.2.7Z" />, true),
  pause: mk(<><rect x="6" y="4.5" width="4" height="15" rx="1" /><rect x="14" y="4.5" width="4" height="15" rx="1" /></>, true),
  next: mk(<><path d="M5 5.6v12.8a.7.7 0 0 0 1.1.6l9.4-6.4a.7.7 0 0 0 0-1.2L6.1 5a.7.7 0 0 0-1.1.6Z" /><rect x="17" y="5" width="2.2" height="14" rx="1" /></>, true),
  prev: mk(<><path d="M19 5.6v12.8a.7.7 0 0 1-1.1.6l-9.4-6.4a.7.7 0 0 1 0-1.2L17.9 5a.7.7 0 0 1 1.1.6Z" /><rect x="4.8" y="5" width="2.2" height="14" rx="1" /></>, true),
  shuffle: mk(<><path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6C14.3 16 15.5 17 17.5 17H21" /><path d="M3 17h3.5c1.4 0 2.4-.5 3.2-1.4M14.3 8.4C15.1 7.5 16.1 7 17.5 7H21" /><path d="m18.5 4.5 2.5 2.5-2.5 2.5M18.5 14.5l2.5 2.5-2.5 2.5" /></>),
  repeat: mk(<><path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19" /><path d="m16 3 3 3-3 3" /><path d="M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5" /><path d="m8 21-3-3 3-3" /></>),
  heart: mk(<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />),
  heartFill: mk(<path d="M12 20.6c-.2 0-.4 0-.5-.1C11.1 20.2 3.7 15.6 3.7 9.8A5 5 0 0 1 12 6.1a5 5 0 0 1 8.3 3.7c0 5.8-7.4 10.4-7.8 10.7-.1.1-.3.1-.5.1Z" />, true),
  vol: mk(<><path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>),
  volLow: mk(<><path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6" /></>),
  mute: mk(<><path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4Z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></>),
  home: mk(<><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" /></>),
  search: mk(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>),
  library: mk(<><path d="M5 4v16M9.5 4v16" /><path d="m14 4.6 4.6 15" /></>),
  stats: mk(<><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></>),
  settings: mk(<><circle cx="12" cy="12" r="3" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" /></>),
  lyrics: mk(<><path d="M4 6h11M4 10.5h8M4 15h6" /><circle cx="17" cy="16.5" r="2.5" /><path d="M19.5 16.5V7l2 .8" /></>),
  queue: mk(<><path d="M4 6h12M4 11h12M4 16h7" /><path d="M15 14.5v5l4.2-2.5-4.2-2.5Z" /></>),
  now: mk(<><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="12" cy="12" r="3.2" /></>),
  device: mk(<><rect x="3.5" y="4.5" width="13" height="10" rx="1.5" /><path d="M7 19h6M10 14.5V19" /><rect x="17.5" y="9" width="3.5" height="10.5" rx="1" /></>),
  speaker: mk(<><rect x="6" y="3" width="12" height="18" rx="2" /><circle cx="12" cy="14" r="3.2" /><circle cx="12" cy="7" r=".8" fill="currentColor" /></>),
  phone: mk(<><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></>),
  mini: mk(<><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="11.5" y="11.5" width="7" height="5" rx="1" fill="currentColor" stroke="none" /></>),
  expand: mk(<><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></>),
  collapse: mk(<><path d="M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7" /></>),
  back: mk(<path d="m14.5 5-7 7 7 7" />),
  forward: mk(<path d="m9.5 5 7 7-7 7" />),
  more: mk(<><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" /></>),
  close: mk(<path d="M6 6l12 12M18 6 6 18" />),
  plus: mk(<path d="M12 5v14M5 12h14" />),
  check: mk(<path d="m5 12.5 4.5 4.5L19 7.5" />),
  clock: mk(<><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>),
  moon: mk(<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />),
  link: mk(<><path d="M10 14a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7L12 6.3" /><path d="M14 10a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.1-1.1" /></>),
  sort: mk(<><path d="M7 4v16M3.5 16.5 7 20l3.5-3.5" /><path d="M14 6h7M14 11h5M14 16h3" /></>),
  filter: mk(<><path d="M4 6h16M7 12h10M10 18h4" /></>),
  explicit: mk(<><rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="currentColor" stroke="none" opacity=".9" /><path d="M14.5 8h-5v8h5M9.5 12h4.2" stroke="var(--bg)" strokeWidth="2" /></>),
  keyboard: mk(<><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7.5 14h9" /></>),
  logout: mk(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16.5 14.5 12 10 7.5M14.5 12H4" /></>),
  wave: mk(<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0" />),
  disc: mk(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.2" /></>),
  user: mk(<><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.2-3.6 4-5.2 7.5-5.2s6.3 1.6 7.5 5.2" /></>),
};

/** Анимированный индикатор «играет сейчас». */
export const Bars = ({ playing = true }: { playing?: boolean }) => (
  <span className={`eq ${playing ? 'on' : ''}`} aria-hidden><i /><i /><i /></span>
);
