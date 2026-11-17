import { useEffect, useRef } from 'react';
import { player } from '../../lib/player';
import { fx } from '../../lib/fx';

type Flake = { x: number; y: number; r: number; vy: number; sway: number; phase: number; o: number; puff?: boolean; vx?: number; life?: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number; trail: [number, number][] };

const FIREWORK_HUES = [42, 8, 140, 205, 320, 50];

/**
 * Снег на canvas: скорость зависит от воспроизведения (на паузе снег почти замирает),
 * ветер — от движения мыши, клик выбивает облачко снежинок. Здесь же рисуется салют.
 */
export function Snow({ level, enabled }: { level: 1 | 2 | 3; enabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const target = () => (enabled ? Math.round((w * h) / 1e6 * [0, 70, 150, 320][level]) + [0, 20, 40, 80][level] : 0);
    const make = (top = false): Flake => {
      const depth = Math.random();
      return {
        x: Math.random() * w, y: top ? -10 - Math.random() * 40 : Math.random() * h,
        r: 0.7 + depth * depth * (level === 3 ? 3.4 : 2.8), vy: 18 + depth * 46, sway: 6 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2, o: 0.35 + depth * 0.55,
      };
    };
    let flakes: Flake[] = Array.from({ length: target() }, () => make());
    let sparks: Spark[] = [];
    let fireworksUntil = 0;
    let nextRocket = 0;

    let wind = 0, windTarget = 0, lastMouseX: number | null = null, speed = 1;
    const onMove = (e: PointerEvent) => {
      if (lastMouseX !== null) windTarget = Math.max(-60, Math.min(60, windTarget + (e.clientX - lastMouseX) * 0.6));
      lastMouseX = e.clientX;
    };
    const onClick = (e: PointerEvent) => {
      if (!enabled || e.button !== 0) return;
      burstSnow(e.clientX, e.clientY, 9);
    };
    const burstSnow = (x: number, y: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 90;
        flakes.push({ x, y, r: 0.8 + Math.random() * 1.8, vy: 0, sway: 4, phase: 0, o: 0.9, puff: true, vx: Math.cos(a) * v, life: 1.4 + Math.random() });
        flakes[flakes.length - 1].vy = Math.sin(a) * v - 30;
      }
    };
    const offFx = fx.on((ev) => {
      if (ev.type === 'puff') burstSnow(ev.x, ev.y, ev.n ?? 12);
      if (ev.type === 'fireworks') { fireworksUntil = performance.now() + (ev.seconds ?? 12) * 1000; nextRocket = 0; }
    });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onClick);

    const rocket = () => {
      const x = w * (0.15 + Math.random() * 0.7), y = h * (0.12 + Math.random() * 0.3);
      const hue = FIREWORK_HUES[Math.floor(Math.random() * FIREWORK_HUES.length)];
      const n = 60 + Math.floor(Math.random() * 40);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.1, v = 80 + Math.random() * 160;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 1.1 + Math.random() * 0.9, hue: hue + (Math.random() * 20 - 10), trail: [] });
      }
    };

    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      ctx.clearRect(0, 0, w, h);

      // на паузе снег почти замирает — «время остановилось»
      const want = player.get().playing ? 1 : 0.18;
      speed += (want - speed) * Math.min(1, dt * 1.5);
      windTarget *= 1 - Math.min(1, dt * 0.8);
      wind += (windTarget - wind) * Math.min(1, dt * 2);

      const need = target();
      if (flakes.length - flakes.filter((f) => f.puff).length < need) flakes.push(make(true));

      ctx.fillStyle = '#ffffff';
      const keep: Flake[] = [];
      let base = flakes.length - flakes.filter((f) => f.puff).length;
      for (const f of flakes) {
        if (f.puff) {
          f.life! -= dt;
          f.vy += 160 * dt; f.vx! *= 1 - dt * 2.5; f.vy *= 1 - dt * 1.2;
          f.x += f.vx! * dt; f.y += f.vy * dt;
          if (f.life! <= 0) continue;
          ctx.globalAlpha = Math.min(1, f.life!) * f.o;
        } else {
          f.phase += dt * (0.6 + f.r * 0.15) * (0.3 + speed * 0.7);
          f.y += f.vy * dt * speed;
          f.x += (Math.sin(f.phase) * f.sway * 0.6 + wind * (0.4 + f.r * 0.25)) * dt * (0.25 + speed * 0.75);
          if (f.y > h + 6) {
            if (base > need) { base--; continue; } // снегопад ослаб — снежинка не возвращается наверх
            Object.assign(f, make(true));
          }
          if (f.x > w + 8) f.x = -8; else if (f.x < -8) f.x = w + 8;
          ctx.globalAlpha = f.o;
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        keep.push(f);
      }
      flakes = keep;

      // салют
      if (now < fireworksUntil && now > nextRocket) { rocket(); nextRocket = now + 380 + Math.random() * 700; }
      if (sparks.length) {
        ctx.globalCompositeOperation = 'lighter';
        sparks = sparks.filter((s) => {
          s.life += dt;
          if (s.life > s.max) return false;
          s.vy += 90 * dt; s.vx *= 1 - dt * 1.6; s.vy *= 1 - dt * 1.6;
          s.trail.push([s.x, s.y]); if (s.trail.length > 6) s.trail.shift();
          s.x += s.vx * dt; s.y += s.vy * dt;
          const a = 1 - s.life / s.max;
          ctx.globalAlpha = a;
          ctx.strokeStyle = `hsl(${s.hue} 95% ${60 + a * 20}%)`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(s.trail[0][0], s.trail[0][1]);
          for (const [x, y] of s.trail) ctx.lineTo(x, y);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
          return true;
        });
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      offFx();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onClick);
    };
  }, [level, enabled]);

  return <canvas ref={ref} className="snow-canvas" aria-hidden />;
}
