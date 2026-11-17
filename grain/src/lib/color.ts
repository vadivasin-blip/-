/** Достаёт «характерный» цвет обложки: насыщенный, не слишком тёмный и не белый. */
const cache = new Map<string, Promise<string | null>>();

export function coverColor(url: string | undefined): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  if (!cache.has(url)) cache.set(url, extract(url));
  return cache.get(url)!;
}

function extract(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      try {
        const N = 40;
        const c = document.createElement('canvas');
        c.width = c.height = N;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(im, 0, 0, N, N);
        const d = ctx.getImageData(0, 0, N, N).data;
        const buckets = new Map<string, { n: number; r: number; g: number; b: number; s: number }>();
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const [h, s, l] = rgbToHsl(r, g, b);
          if (l < 0.18 || l > 0.86) continue;
          const key = `${Math.round(h * 18)}`;
          const bk = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, s: 0 };
          bk.n++; bk.r += r; bk.g += g; bk.b += b; bk.s += s;
          buckets.set(key, bk);
        }
        let best: { score: number; rgb: [number, number, number] } | null = null;
        for (const bk of buckets.values()) {
          const sat = bk.s / bk.n;
          const score = bk.n * (0.25 + sat * sat * 2.2);
          if (!best || score > best.score) best = { score, rgb: [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n] };
        }
        if (!best) return resolve(null);
        // почти бесцветная обложка — оставляем фирменный акцент
        if (rgbToHsl(...best.rgb)[1] < 0.16) return resolve(null);
        resolve(tune(best.rgb));
      } catch { resolve(null); }
    };
    im.onerror = () => resolve(null);
    im.src = url;
  });
}

/** Приводим к читаемому на тёмном фоне акценту. */
function tune([r, g, b]: [number, number, number]) {
  let [h, s, l] = rgbToHsl(r, g, b);
  s = Math.min(0.78, Math.max(s, s < 0.12 ? s : 0.38));
  l = Math.min(0.72, Math.max(0.58, l));
  const [R, G, B] = hslToRgb(h, s, l);
  return `rgb(${R} ${G} ${B})`;
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (!s) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}
