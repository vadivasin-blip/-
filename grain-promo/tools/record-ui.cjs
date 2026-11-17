// Съёмка реального интерфейса Grain (демо-режим) для промо-ролика.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/home/user/-/grain-promo/rec';
const W = 1920, H = 1080;
const only = process.argv[2];

async function shoot(b, name, settings, extraInit, act) {
  if (only && only !== name) return;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT + '/raw_' + name, size: { width: W, height: H } } });
  await ctx.addInitScript(([s, extra]) => {
    localStorage.setItem('grain.settings', JSON.stringify(s));
    if (extra) sessionStorage.setItem('grain.drift', extra);
  }, [settings, extraInit]);
  const p = await ctx.newPage();
  const t0 = Date.now();
  await p.goto('http://127.0.0.1:4173/?demo');
  await p.waitForTimeout(1800);
  const marks = { start: (Date.now() - t0) / 1000 };
  await act(p, (k) => { marks[k] = (Date.now() - t0) / 1000; });
  const v = p.video();
  await ctx.close();
  fs.copyFileSync(await v.path(), `${OUT}/${name}.webm`);
  fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify(marks));
  console.log(name, JSON.stringify(marks));
}

(async () => {
  const b = await chromium.launch();

  await shoot(b, 'home', { snowLevel: 1 }, null, async (p, mark) => {
    await p.mouse.move(1500, 600);
    await p.waitForTimeout(800);
    mark('move');
    await p.mouse.move(900, 420, { steps: 30 });
    await p.waitForTimeout(4500);
  });

  await shoot(b, 'deck', { snow: false }, null, async (p, mark) => {
    await p.click('.deck-transport .play-btn'); // пауза
    await p.waitForTimeout(1500);
    mark('play');
    await p.click('.deck-transport .play-btn'); // пуск: пластинка крутится
    await p.waitForTimeout(3500);
    const ring = await (await p.$('.turntable .ring')).boundingBox();
    const cx = ring.x + ring.width / 2, cy = ring.y + ring.height / 2, R = (ring.width / 2) * 0.95;
    const at = (f) => [cx + R * Math.sin(f * 2 * Math.PI), cy - R * Math.cos(f * 2 * Math.PI)];
    let [x, y] = at(0.28);
    await p.mouse.move(x, y);
    await p.waitForTimeout(300);
    mark('seek');
    await p.mouse.down();
    for (let f = 0.28; f <= 0.72; f += 0.01) { [x, y] = at(f); await p.mouse.move(x, y); await p.waitForTimeout(25); }
    await p.mouse.up();
    await p.waitForTimeout(1500);
    const k = await (await p.$('.knob')).boundingBox();
    await p.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
    mark('knob');
    await p.mouse.down();
    for (let i = 0; i < 40; i++) { await p.mouse.move(k.x + k.width / 2, k.y + k.height / 2 - i * 2); await p.waitForTimeout(20); }
    await p.waitForTimeout(400);
    await p.mouse.up();
    await p.waitForTimeout(1500);
  });

  await shoot(b, 'shelf', { snow: false }, null, async (p, mark) => {
    await p.click('.tb-tabs button:has-text("Полка")');
    await p.waitForTimeout(1200);
    mark('hover');
    const cards = await p.$$('.sleeve-card');
    for (const i of [2, 3, 4, 5, 6]) {
      const bb = await cards[i].boundingBox();
      await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.width / 2, { steps: 12 });
      await p.waitForTimeout(700);
    }
    await p.click('.tb-tabs button:has-text("Главная")');
    await p.waitForTimeout(1200);
    await p.click('.t-album >> nth=1');
    await p.waitForTimeout(1300);
    mark('album');
    await p.mouse.move(1200, 700);
    await p.mouse.wheel(0, 300);
    await p.waitForTimeout(2500);
  });

  await shoot(b, 'lyrics', { snow: false }, null, async (p, mark) => {
    await p.keyboard.press('f');
    await p.waitForTimeout(600);
    await p.click('.fn-right p:has-text("Огни на воде") >> nth=0');
    await p.mouse.move(100, 1000);
    mark('go');
    await p.waitForTimeout(9000);
  });

  await shoot(b, 'winter', { snowLevel: 2 }, '1500', async (p, mark) => {
    await p.mouse.move(1300, 500);
    await p.waitForTimeout(2000);
    mark('pause');
    await p.click('.deck-transport .play-btn');
    await p.waitForTimeout(2500);
    mark('resume');
    await p.click('.deck-transport .play-btn');
    await p.waitForTimeout(1500);
    mark('puffs');
    for (let i = 0; i < 6; i++) { await p.mouse.click(1200 + i * 100, 150 + (i % 2) * 40); await p.waitForTimeout(150); }
    mark('fireworks');
    await p.click('.countdown');
    await p.waitForTimeout(5000);
  });

  await b.close();
})();
