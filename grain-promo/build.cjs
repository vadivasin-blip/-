// Генератор проекта промо-ролика Grain в трёх направлениях стиля (A, B, C).
// node build.cjs a|b|c  → пишет style_<x>/index.html
const fs = require('fs');
const S = process.argv[2] || 'a';
const D = 30.6;

// Голос: фразы и время (из vo/marks.json)
const V = JSON.parse(fs.readFileSync(__dirname + '/vo/marks.json', 'utf8'));

const STYLES = {
  a: { name: 'Ночное небо', bg: '#0a1120', fg: '#eef3fc', accent: '#f2c66d', muted: '#8fa0c0', ink: '#0a1120',
       frame: { x: 700, y: 170, w: 1140, h: 641, r: 18, rot: 0 }, copy: { x: 96, y: 300, w: 560 }, h1: 58, big: 124 },
  b: { name: 'Оборот конверта', bg: '#efe6d6', fg: '#1c1712', accent: '#c8402e', muted: '#6b5d4f', ink: '#1c1712',
       frame: { x: 90, y: 180, w: 1060, h: 596, r: 4, rot: -1.2 }, copy: { x: 1230, y: 250, w: 620 }, h1: 64, big: 130 },
  c: { name: 'Вертушка', bg: '#0b0a09', fg: '#f3ece0', accent: '#f0a33c', muted: '#8c8173', ink: '#0b0a09',
       frame: { x: 110, y: 350, w: 1000, h: 562, r: 14, rot: 0 }, copy: { x: 110, y: 46, w: 1300 }, h1: 72, big: 128 },
};
const st = STYLES[S];

// Удары: заголовок на экране к каждой фразе. kicker — маленькая метка (у B — как номер трека).
const BEATS = [
  { id: 'b1', at: 0.25, out: 2.85, kick: { a: '✳ новинка', b: 'A1', c: '01 / 08' }[S], title: 'Grain', sub: 'плеер для Spotify', big: true },
  { id: 'b2', at: 3.05, out: 5.75, kick: { a: 'вместо списка', b: 'A2', c: '02 / 08' }[S], title: 'Живой проигрыватель', strike: 'список треков' },
  { id: 'b3', at: 5.95, out: 10.35, kick: { a: 'дека', b: 'A3', c: '03 / 08' }[S], title: 'Пластинка крутится', sub: 'тонарм идёт к центру вместе с песней' },
  { id: 'b4', at: 10.55, out: 13.85, kick: { a: 'управление', b: 'A4', c: '04 / 08' }[S], title: 'Перемотка по кругу', sub: 'громкость — поворотной ручкой' },
  { id: 'b5', at: 14.0, out: 18.45, kick: { a: 'полка', b: 'B1', c: '05 / 08' }[S], title: 'Конверты и стороны A/B', sub: 'альбомы лежат как пластинки' },
  { id: 'b6', at: 18.6, out: 20.85, kick: { a: 'текст', b: 'B2', c: '06 / 08' }[S], title: 'Текст по словам', sub: 'караоке в такт песне' },
  { id: 'b7', at: 21.0, out: 26.6, kick: { a: 'зимняя тема', b: 'B3', c: '07 / 08' }[S], title: 'Зимняя тема', chips: [['снег', 21.95], ['гирлянда', 22.5], ['сугроб', 23.15], ['пауза — снег замирает', 23.9], ['салют', 25.2]] },
  { id: 'b8', at: 27.2, out: null, kick: { a: 'для Windows', b: 'B4', c: '08 / 08' }[S], title: 'Grain', sub: 'музыка, которую видно', big: true, final: true },
];

// Кадрирование интерфейса внутри окна: [время, fx, fy, zoom] — точка интерфейса 1920×1080 в центре окна.
const CAM = [
  [0.0, 960, 540, 1], [3.05, 960, 540, 1], [5.6, 200, 270, 2.4], [8.6, 240, 225, 3.0], [10.45, 195, 245, 2.4],
  [12.2, 175, 600, 3.0], [14.0, 1100, 420, 1.3], [16.55, 860, 430, 1.55], [18.55, 1100, 420, 1.75], [20.95, 960, 260, 1.3],
  [23.0, 960, 880, 1.3], [24.7, 960, 540, 1.0], [27.0, 960, 540, 1.0],
];
// Отрезки видео: файл, начало в ролике, начало в исходнике, длина
const FOOT = [
  ['home', 0.6, 1.9, 2.75], ['deck', 3.05, 2.0, 5.65], ['deck', 8.6, 5.6, 1.9], ['deck', 10.4, 7.35, 1.9], ['deck', 12.2, 11.85, 1.85],
  ['shelf', 13.95, 3.1, 2.65], ['shelf', 16.5, 13.0, 2.1], ['lyrics', 18.5, 3.3, 2.5], ['winter', 20.9, 2.1, 3.9], ['winter', 24.7, 8.75, 2.6],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const beatHtml = BEATS.filter((b) => !b.final).map((b) => `
    <div class="beat ${b.big ? 'big' : ''} ${b.final ? 'final' : ''}" id="${b.id}" data-layer>
      <div class="kick" data-small>${esc(b.kick)}</div>
      ${b.strike ? `<div class="strike"><span>${esc(b.strike)}</span></div>` : ''}
      <h1>${esc(b.title)}</h1>
      ${b.sub ? `<p class="sub">${esc(b.sub)}</p>` : ''}
      ${b.chips ? `<div class="chips">${b.chips.map(([c], j) => `<span class="chip" id="${b.id}c${j}">${esc(c)}</span>`).join('')}</div>` : ''}
      ${b.final ? `<div class="cta" data-small><span class="cta-dot"></span><span>github.com/vadivasin-blip/-/releases</span></div>` : ''}
    </div>`).join('');
const finalHtml = BEATS.filter((b) => b.final).map((b) => `
    <div class="beat big final" id="${b.id}">
      <div class="kick" data-small>${esc(b.kick)}</div>
      <h1>${esc(b.title)}</h1>
      <p class="sub">${esc(b.sub)}</p>
      <div class="cta" data-small><span class="cta-dot"></span><span>github.com/vadivasin-blip/-/releases</span></div>
    </div>`).join('');
const footHtml = FOOT.map(([f, at, inn, dur], i) => `<img class="clip" id="f${i}" data-footage="media/${f}.mp4" data-at="${at}" data-in="${inn}" data-dur="${dur}" data-oversize="1.15">`).join('\n        ');

const F = st.frame;
const css = `
  :root { --bg: ${st.bg}; --fg: ${st.fg}; --accent: ${st.accent}; --muted: ${st.muted}; --ink: ${st.ink};
          --font-display: "Unbounded"; --font-text: "Onest"; --font-mono: "JetBrains Mono"; }
  #stage { color: var(--fg); font-family: var(--font-text), sans-serif; }
  .bg { background: var(--bg); }
  .layer { position: absolute; inset: 0; }
  .frame { position: absolute; left: ${F.x}px; top: ${F.y}px; width: ${F.w}px; height: ${F.h}px; rotate: ${F.rot}deg; }
  .view { position: absolute; inset: 0; overflow: hidden; border-radius: ${F.r}px; background: #0a1120; }
  .cam { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0; }
  .cam .clip { position: absolute; inset: 0; width: 1920px; height: 1080px; object-fit: cover; visibility: hidden; }
  .finale { position: absolute; left: 0; right: 0; top: 500px; text-align: center; }
  .finale .beat { position: static; }
  .finale .beat.big h1 { font-size: 150px; }
  .copy { position: absolute; left: ${st.copy.x}px; top: ${st.copy.y}px; width: ${st.copy.w}px; }
  .beat { position: absolute; left: 0; top: 0; width: 100%; }
  .kick { font: 500 28px/1 var(--font-mono), monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin-bottom: 22px; white-space: nowrap; }
  .beat h1 { font: 700 ${st.h1}px/1.06 var(--font-display), sans-serif; letter-spacing: -.02em; margin: 0; }
  .beat.big h1 { font-size: ${st.big}px; font-weight: 800; letter-spacing: -.04em; }
  .sub { font: 500 46px/1.25 var(--font-text), sans-serif; color: var(--muted); margin: 22px 0 0; }
  .strike { font: 600 34px/1 var(--font-text); color: var(--muted); margin-bottom: 16px; display: inline-block; position: relative; }
  .cta { display: inline-flex; align-items: center; gap: 14px; margin-top: 40px; font: 500 30px var(--font-mono); padding: 16px 26px; border-radius: 999px; border: 2px solid var(--accent); white-space: nowrap; }
  .chips { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 30px; }
  .chip { font: 600 44px/1 var(--font-text); padding: 14px 24px 16px; border-radius: 999px; border: 2px solid var(--accent); color: var(--fg); white-space: nowrap; }
  .cta-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--accent); }
  /* пластинка-логотип */
  .disc { position: absolute; border-radius: 50%;
    background: radial-gradient(circle, var(--accent) 0 17%, #0d0c0b 17.5% 18.5%, transparent 19%),
                repeating-radial-gradient(circle, #121110 0 2px, #1d1b19 2.6px 3.6px, #121110 4.2px);
    box-shadow: 0 30px 80px -20px rgba(0,0,0,.7), inset 0 0 0 2px rgba(255,255,255,.05); }
  .disc::after { content: ''; position: absolute; inset: 0; border-radius: 50%;
    background: conic-gradient(from 20deg, transparent 0deg, rgba(255,255,255,.10) 30deg, transparent 65deg 180deg, rgba(255,255,255,.07) 210deg, transparent 245deg); }
  .disc i { position: absolute; left: 50%; top: 50%; width: 3%; height: 3%; margin: -1.5% 0 0 -1.5%; border-radius: 50%; background: #e9e2d5; }
  .disc .rot { position: absolute; inset: 0; border-radius: 50%; }
  .disc .rot b { position: absolute; left: 50%; top: 31%; width: 3%; height: 7%; margin-left: -1.5%; background: rgba(0,0,0,.35); border-radius: 2px; }
${S === 'a' ? `
  .frame .view { box-shadow: 0 40px 120px -30px rgba(0,0,0,.9), 0 0 0 1.5px rgba(242,198,109,.55); }
  #snow { position: absolute; inset: 0; }
  .glow { position: absolute; left: -200px; top: 600px; width: 900px; height: 700px; background: radial-gradient(closest-side, rgba(242,198,109,.10), transparent); }
  .disc.hero { left: 120px; top: 640px; width: 300px; height: 300px; }
` : ''}${S === 'b' ? `
  .frame .view { box-shadow: 14px 14px 0 var(--ink); border: 3px solid var(--ink); background: #0a1120; }
  .paper { position: absolute; inset: 0; background:
      repeating-linear-gradient(0deg, transparent 0 46px, rgba(28,23,18,.06) 46px 47px); }
  .rule { position: absolute; left: 1230px; width: 620px; height: 3px; background: var(--ink); }
  .kick { display: inline-block; color: var(--bg); background: var(--accent); padding: 8px 12px 7px; letter-spacing: .08em; }
  .beat h1 { color: var(--ink); }
  .sub { color: var(--muted); }
  .leader { position: absolute; left: 1230px; top: 840px; width: 620px; font: 500 20px var(--font-mono); color: var(--muted); display: flex; gap: 12px; align-items: baseline; }
  .leader i { flex: 1; border-bottom: 3px dotted var(--muted); transform: translateY(-6px); }
  .disc.hero { left: 1520px; top: 600px; width: 360px; height: 360px; }
` : ''}${S === 'c' ? `
  .frame .view { box-shadow: 0 50px 140px -30px rgba(0,0,0,.95); }
  .disc.big { left: 1120px; top: -230px; width: 1540px; height: 1540px; }
  .beat h1 { text-transform: none; }
  .tick { position: absolute; left: 110px; top: 950px; font: 500 18px var(--font-mono); color: var(--muted); letter-spacing: .14em; }
  .bar { position: absolute; left: 110px; top: 990px; width: 1000px; height: 3px; background: rgba(243,236,224,.15); }
  .bar i { position: absolute; left: 0; top: 0; bottom: 0; width: 100%; background: var(--accent); transform-origin: 0 0; transform: scaleX(0); }
` : ''}`;

const decorHtml = {
  a: `<canvas id="snow" width="1920" height="1080"></canvas><div class="glow"></div><div class="disc hero" id="disc"><div class="rot" id="discrot"><b></b></div><i></i></div>`,
  b: `<div class="paper"></div><div class="rule" id="rule1" style="top:200px"></div><div class="leader" id="leader"><span>сторона A</span><i></i><span class="mono-t">0:30</span></div><div class="disc hero" id="disc"><div class="rot" id="discrot"><b></b></div><i></i></div>`,
  c: `<div class="disc big" id="disc"><div class="rot" id="discrot"><b></b></div><i></i></div><div class="tick" id="tick">GRAIN · ПРОИГРЫВАТЕЛЬ ДЛЯ SPOTIFY</div><div class="bar"><i id="barfill"></i></div>`,
}[S];

const js = `
M.start(({ tl }) => {
  const st = ${JSON.stringify({ frame: st.frame })};
  const CAM = ${JSON.stringify(CAM)};
  const FOOT = ${JSON.stringify(FOOT)};
  const BEATS = ${JSON.stringify(BEATS.map((b) => ({ id: b.id, at: b.at, out: b.out, big: !!b.big, strike: !!b.strike, final: !!b.final, chips: b.chips || null })))};
  const vw = st.frame.w, vh = st.frame.h, base = vw / 1920;
  const camAt = (fx, fy, z) => {
    const s = base * z;
    let x = vw / 2 - fx * s, y = vh / 2 - fy * s;
    x = Math.min(0, Math.max(vw - 1920 * s, x)); y = Math.min(0, Math.max(vh - 1080 * s, y));
    return { x, y, scale: s };
  };
  // камера внутри окна
  gsap.set('.cam', camAt(CAM[0][1], CAM[0][2], CAM[0][3]));
  CAM.slice(1).forEach(([t, fx, fy, z], i) => {
    const prev = CAM[i];
    if (prev[1] === fx && prev[2] === fy && prev[3] === z) return;
    tl.to('.cam', { ...camAt(fx, fy, z), duration: 0.8, ease: 'power3.inOut' }, t - 0.4);
  });
  // отрезки видео: плавная смена кадра
  FOOT.forEach(([f, at, inn, dur], i) => {
    const el = '#f' + i;
    if (i === 0) gsap.set(el, { autoAlpha: 1 });
    else tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22, ease: 'none' }, at);
    // предыдущий отрезок уже закрыт новым сверху — убираем его плавно, без скачка
    if (i < FOOT.length - 1) tl.to(el, { autoAlpha: 0, duration: 0.2, ease: 'none' }, FOOT[i + 1][1] + 0.25);
  });
  // окно: влёт и финальный уход
  tl.fromTo('.frame', { y: 140, scale: 0.86, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: 'expo.out' }, 0.55);
  tl.to('.frame', { y: 60, scale: 0.9, autoAlpha: 0, duration: 0.5, ease: 'power3.in' }, 26.55);

  // заголовки
  BEATS.forEach((b, i) => {
    const sel = '#' + b.id;
    gsap.set(sel, { autoAlpha: 1 });
    M.show(sel + ' .kick', { at: b.at, in: 'slide' });
    if (b.strike) {
      M.show(sel + ' .strike', { at: b.at + 0.08, in: 'rise' });
      M.draw.strike(sel + ' .strike span', { at: b.at + 0.55, color: 'var(--accent)', width: 5 });
    }
    M.text(sel + ' h1', { at: b.at + (b.strike ? 0.9 : 0.12), in: b.big ? 'pop' : 'rise', by: b.big ? 'chars' : 'words' });
    if (document.querySelector(sel + ' .sub')) M.text(sel + ' .sub', { at: b.at + (b.strike ? 1.2 : 0.5), in: 'rise', by: 'words', sfx: false });
    if (b.final) M.show(sel + ' .cta', { at: b.at + 1.0, in: 'pop' });
    if (b.chips) b.chips.forEach(([c, t], j) => M.show(sel + 'c' + j, { at: t, in: 'pop' }));
    if (b.out) tl.to(sel, { autoAlpha: 0, y: -24, duration: 0.35, ease: 'power1.in' }, b.out - 0.35);
  });
  M.hit(0.25, 'l');
  M.hit(27.15, 'l');

  // вращение пластинки — функция от времени
  M.onFrame((t) => { const r = document.getElementById('discrot'); if (r) r.style.transform = 'rotate(' + (t * 140) + 'deg)'; });
  ${S === 'a' ? `
  // снег: детерминированный, от времени
  const cv = document.getElementById('snow'), cx = cv.getContext('2d');
  const R = M.rand(7), fl = Array.from({ length: 170 }, () => ({ x: R() * 1920, y: R() * 1080, r: 0.8 + R() * R() * 3.2, v: 25 + R() * 55, s: 8 + R() * 22, p: R() * 6.28 }));
  M.onFrame((t) => {
    cx.clearRect(0, 0, 1920, 1080); cx.fillStyle = '#fff';
    for (const f of fl) {
      const y = (f.y + f.v * t) % 1100 - 10, x = (f.x + Math.sin(f.p + t * 0.8) * f.s + 1920) % 1920;
      cx.globalAlpha = 0.25 + f.r / 5; cx.beginPath(); cx.arc(x, y, f.r, 0, 6.283); cx.fill();
    }
  });
  tl.fromTo('#disc', { x: -420, rotate: -40 }, { x: 0, rotate: 0, duration: 1.1, ease: 'expo.out' }, 0.1);
  tl.to('#disc', { x: -460, duration: 0.6, ease: 'power3.in' }, 2.6);
  tl.fromTo('#disc', { x: 690, y: -440, scale: 0, rotate: -120 }, { scale: 1.1, rotate: 0, duration: 1.1, ease: 'power3.inOut', immediateRender: false }, 26.95);
  ` : ''}${S === 'b' ? `
  tl.fromTo('#rule1', { scaleX: 0, transformOrigin: '0 0' }, { scaleX: 1, duration: 0.7, ease: 'expo.out' }, 0.2);
  M.show('#leader', { at: 14.4, in: 'fade' }); tl.to('#leader', { autoAlpha: 0, duration: 0.25 }, 18.2);
  tl.fromTo('#disc', { x: 500, rotate: 60 }, { x: 0, rotate: 0, duration: 1.0, ease: 'expo.out' }, 0.15);
  tl.to('#disc', { x: 520, duration: 0.55, ease: 'power3.in' }, 2.55);
  tl.fromTo('#disc', { x: 520 }, { x: 0, duration: 1.0, ease: 'expo.out' }, 27.4);
  ` : ''}${S === 'c' ? `
  tl.fromTo('#disc', { x: 900, rotate: -90 }, { x: 0, rotate: 0, duration: 1.4, ease: 'expo.out' }, 0.0);
  M.show('#tick', { at: 0.4, in: 'fade' });
  tl.fromTo('#barfill', { scaleX: 0 }, { scaleX: 1, duration: ${D - 0.6}, ease: 'none' }, 0.3);
  ` : ''}
  // финальный кадр: заголовок по центру колонки
});`;

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="fonts/fonts.css">
<style>${css}
</style>
</head>
<body>
<div id="stage" data-width="1920" data-height="1080" data-fps="30" data-duration="${D}" data-safe="none" data-sfx="02">
  <div class="bg" data-bg></div>
  <div class="layer" data-decor>${decorHtml}</div>
  <div class="frame">
    <div class="view">
      <div class="cam">
        ${footHtml}
      </div>
    </div>
  </div>
  <div class="finale">${finalHtml}</div>
  <div class="copy">${beatHtml}
  </div>
</div>
<audio src="media/voice.wav" data-at="0" data-voice></audio>
<audio src="media/music.wav" data-at="0" data-fade-in="0.5" data-fade-out="1.2"></audio>
<script src="lib/gsap.min.js"></script>
<script src="lib/CustomEase.min.js"></script>
<script src="lib/SplitText.min.js"></script>
<script src="lib/DrawSVGPlugin.min.js"></script>
<script src="lib/MotionPathPlugin.min.js"></script>
<script src="lib/MorphSVGPlugin.min.js"></script>
<script src="motion.js"></script>
<script src="data.js"></script>
<script>${js}
</script>
</body>
</html>`;
fs.writeFileSync(`${__dirname}/style_${S}/index.html`, html);
console.log('ok style_' + S, st.name);
