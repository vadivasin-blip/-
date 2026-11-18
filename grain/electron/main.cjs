'use strict';
const {
  app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage,
  globalShortcut, safeStorage, session, screen,
} = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// castLabs-сборка Electron даёт Widevine CDM; в обычном Electron его нет.
let components = null;
try { components = require('electron').components; } catch { /* plain electron */ }

const PORT = 43117;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const DIST = path.join(__dirname, '..', 'dist');
const DEV_URL = process.env.GRAIN_DEV_URL; // например http://127.0.0.1:5173

const userDir = app.getPath('userData');
const statePath = path.join(userDir, 'window-state.json');
const secretPath = path.join(userDir, 'session.bin');
const prefsPath = path.join(userDir, 'prefs.json');

let win = null;
let tray = null;
let quitting = false;
let miniMode = false;
let normalBounds = null;
let prefs = { closeToTray: false, globalHotkeys: true };
let lastThumb = null;

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => showWindow());
app.setAppUserModelId('app.grain.player');

// ── helpers ──────────────────────────────────────────────────────────────
function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function writeJson(p, v) {
  try { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v)); } catch {}
}
function send(ch, payload) { if (win && !win.isDestroyed()) win.webContents.send(ch, payload); }
function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
}

// ── локальный сервер: отдаёт интерфейс и принимает OAuth-редирект ────────
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.json': 'application/json', '.webp': 'image/webp',
};
const CALLBACK_PAGE = (ok) => `<!doctype html><meta charset="utf-8"><title>Grain</title>
<style>html,body{height:100%;margin:0;background:#12110f;color:#ede8df;font:15px/1.5 system-ui,sans-serif;display:grid;place-items:center}
div{max-width:360px;text-align:center}b{display:block;font-size:20px;margin-bottom:6px}span{color:#8f887c}</style>
<div><b>${ok ? 'Готово' : 'Вход не выполнен'}</b><span>${ok ? 'Можно закрыть вкладку и вернуться в Grain.' : 'Вернитесь в Grain и попробуйте ещё раз.'}</span></div>
<script>setTimeout(()=>window.close(),1500)</script>`;

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, ORIGIN);
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(CALLBACK_PAGE(!!code));
      send('auth:callback', { code, state, error });
      showWindow();
      return;
    }
    let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
    if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    if (url.pathname === '/' || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(DIST, 'index.html');
    }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      const ext = path.extname(file);
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=31536000',
      });
      res.end(buf);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

// ── окно ──────────────────────────────────────────────────────────────────
function createWindow() {
  const saved = readJson(statePath, {});
  const b = saved.bounds || {};
  const visible = b.x !== undefined && screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return b.x < a.x + a.width - 80 && b.x + b.width > a.x + 80 && b.y >= a.y - 10 && b.y < a.y + a.height - 60;
  });

  win = new BrowserWindow({
    width: b.width || 1320,
    height: b.height || 840,
    x: visible ? b.x : undefined,
    y: visible ? b.y : undefined,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#12110f',
    show: false,
    title: 'Grain',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  if (saved.maximized) win.maximize();

  win.once('ready-to-show', () => win.show());
  win.loadURL(DEV_URL || ORIGIN + '/');

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(ORIGIN) && !(DEV_URL && url.startsWith(DEV_URL))) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  // кнопки «назад/вперёд» на мыши
  win.on('app-command', (_e, cmd) => {
    if (cmd === 'browser-backward') send('nav', 'back');
    if (cmd === 'browser-forward') send('nav', 'forward');
  });

  const persist = () => {
    if (!win || win.isDestroyed() || miniMode) return;
    writeJson(statePath, { bounds: win.isMaximized() ? (readJson(statePath, {}).bounds) : win.getBounds(), maximized: win.isMaximized() });
  };
  win.on('resized', persist);
  win.on('moved', persist);
  win.on('maximize', () => { persist(); send('win:state', { maximized: true }); });
  win.on('unmaximize', () => { persist(); send('win:state', { maximized: false }); });

  win.on('close', (e) => {
    if (!quitting && prefs.closeToTray) { e.preventDefault(); win.hide(); }
  });
  win.on('closed', () => { win = null; });
  win.on('show', () => { if (lastThumb) applyThumbar(lastThumb); });
}

// ── мини-плеер ────────────────────────────────────────────────────────────
function setMini(on) {
  if (!win || on === miniMode) return;
  miniMode = on;
  if (on) {
    normalBounds = win.getBounds();
    if (win.isMaximized()) win.unmaximize();
    win.setMinimumSize(320, 96);
    const area = screen.getDisplayMatching(normalBounds).workArea;
    const w = 400, h = 112;
    win.setBounds({ x: area.x + area.width - w - 24, y: area.y + area.height - h - 24, width: w, height: h }, false);
    win.setAlwaysOnTop(true, 'floating');
    win.setResizable(false);
  } else {
    win.setResizable(true);
    win.setAlwaysOnTop(false);
    win.setMinimumSize(960, 620);
    if (normalBounds) win.setBounds(normalBounds, false);
  }
  send('win:mini', miniMode);
}

// ── кнопки на миниатюре в панели задач Windows ───────────────────────────
function applyThumbar(t) {
  lastThumb = t;
  if (!win || process.platform !== 'win32' || !t || !t.icons) return;
  const img = (k) => nativeImage.createFromDataURL(t.icons[k]);
  win.setThumbarButtons([
    { tooltip: 'Предыдущий', icon: img('prev'), click: () => send('media', 'prev') },
    { tooltip: t.playing ? 'Пауза' : 'Играть', icon: img(t.playing ? 'pause' : 'play'), click: () => send('media', 'toggle') },
    { tooltip: 'Следующий', icon: img('next'), click: () => send('media', 'next') },
  ]);
}

// ── трей ──────────────────────────────────────────────────────────────────
// ── обновления: новая версия с GitHub прямо из программы ─────────────────
let updater = null;
let updateState = { state: 'idle' };
const isPortable = !!process.env.PORTABLE_EXECUTABLE_DIR;
const RELEASES = 'https://github.com/vadivasin-blip/-/releases/latest';

function setUpdate(s) {
  updateState = { ...updateState, ...s };
  send('update:state', updateState);
  updateTrayMenu(lastInfo);
}
function notesText(n) {
  if (!n) return '';
  if (Array.isArray(n)) return n.map((x) => x.note || '').join('\n');
  return String(n).replace(/<[^>]+>/g, '');
}
function initUpdater() {
  if (!app.isPackaged) { updateState = { state: 'dev' }; return; }
  try { updater = require('electron-updater').autoUpdater; } catch (e) { updateState = { state: 'error', error: 'Модуль обновлений недоступен' }; return; }
  // адрес обновлений задан явно — не зависим от app-update.yml внутри сборки
  updater.setFeedURL({ provider: 'generic', url: 'https://github.com/vadivasin-blip/-/releases/latest/download', channel: 'latest' });
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = true;
  updater.allowPrerelease = false;
  updater.on('checking-for-update', () => setUpdate({ state: 'checking', error: null }));
  updater.on('update-available', (i) => setUpdate({ state: 'available', version: i.version, notes: notesText(i.releaseNotes), portable: isPortable }));
  updater.on('update-not-available', () => setUpdate({ state: 'latest', checkedAt: Date.now() }));
  updater.on('download-progress', (p) => setUpdate({ state: 'downloading', percent: Math.round(p.percent || 0) }));
  updater.on('update-downloaded', (i) => setUpdate({ state: 'ready', version: i.version }));
  updater.on('error', (e) => setUpdate({ state: 'error', error: (e && e.message ? e.message : String(e)).split('\n')[0].slice(0, 200) }));
  // первая проверка через 8 секунд после запуска, дальше раз в 6 часов
  setTimeout(() => checkUpdate(), 8000);
  setInterval(() => checkUpdate(), 6 * 3600 * 1000);
}
function checkUpdate() {
  if (!updater) return;
  if (['downloading', 'ready'].includes(updateState.state)) return;
  updater.checkForUpdates().catch(() => {});
}
function downloadUpdate() {
  if (!updater) return;
  if (isPortable) { shell.openExternal(RELEASES); return; }  // портативную версию просто перекачать
  setUpdate({ state: 'downloading', percent: 0 });
  updater.downloadUpdate().catch(() => {});
}
function installUpdate() {
  if (!updater || updateState.state !== 'ready') return;
  quitting = true;
  setImmediate(() => updater.quitAndInstall(true, true)); // тихая установка и сразу запуск новой версии
}

let flyout = null;
let lastInfo = null;
let flyoutHiddenAt = 0;

function buildTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'tray.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('Grain');
  updateTrayMenu(null);
  // левый клик — мини-панель с обложкой и кнопками, двойной — окно Grain, правый — меню
  tray.on('click', () => toggleFlyout());
  tray.on('double-click', () => { hideFlyout(); showWindow(); });
}

function updateTrayMenu(info) {
  if (!tray) return;
  const i = info || {};
  const now = i.title ? `${i.title} — ${i.artist}` : 'Ничего не играет';
  tray.setToolTip(i.title ? `Grain · ${now}`.slice(0, 127) : 'Grain');
  const cmd = (c) => () => send('media', c);
  const vol = Math.round(i.volume ?? 70);
  const sleep = i.sleep;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: now.length > 60 ? now.slice(0, 59) + '…' : now, enabled: false },
    { type: 'separator' },
    { label: i.playing ? 'Пауза' : 'Играть', click: cmd('toggle') },
    { label: 'Следующий трек', click: cmd('next') },
    { label: 'Предыдущий трек', click: cmd('prev') },
    { label: 'Нравится', type: 'checkbox', checked: !!i.liked, enabled: !!i.title, click: cmd('like') },
    { type: 'separator' },
    { label: 'Перемешать', type: 'checkbox', checked: !!i.shuffle, click: cmd('shuffle') },
    { label: 'Повтор', submenu: [
      { label: 'Выключен', type: 'radio', checked: !i.repeat || i.repeat === 'off', click: cmd('repeat:off') },
      { label: 'Весь список', type: 'radio', checked: i.repeat === 'context', click: cmd('repeat:context') },
      { label: 'Один трек', type: 'radio', checked: i.repeat === 'track', click: cmd('repeat:track') },
    ] },
    { label: `Громкость — ${i.muted ? 'без звука' : vol + '%'}`, submenu: [
      { label: 'Громче', click: cmd('volup') },
      { label: 'Тише', click: cmd('voldown') },
      { type: 'separator' },
      ...[100, 75, 50, 25].map((v) => ({ label: v + '%', type: 'radio', checked: !i.muted && Math.abs(vol - v) < 3, click: cmd('vol:' + v) })),
      { label: 'Без звука', type: 'checkbox', checked: !!i.muted, click: cmd('mute') },
    ] },
    { label: sleep ? `Таймер сна — ${sleep === 'track' ? 'в конце трека' : sleep + ' мин'}` : 'Таймер сна', submenu: [
      ...[15, 30, 45, 60, 90].map((m) => ({ label: m + ' минут', click: cmd('sleep:' + m) })),
      { label: 'В конце трека', click: cmd('sleep:track') },
      { type: 'separator' },
      { label: 'Выключить', enabled: !!sleep, click: cmd('sleep:off') },
    ] },
    { type: 'separator' },
    { label: 'Текст песни', click: () => { hideFlyout(); showWindow(); send('media', 'lyrics'); } },
    { label: 'Мини-плеер', type: 'checkbox', checked: miniMode, click: () => { showWindow(); setMini(!miniMode); } },
    { label: 'Оформление', submenu: [
      { label: 'Новогодняя тема', type: 'radio', checked: i.theme === 'winter', click: cmd('theme:winter') },
      { label: 'Классика', type: 'radio', checked: i.theme === 'classic', click: cmd('theme:classic') },
      { label: 'По сезону', type: 'radio', checked: i.theme === 'auto', click: cmd('theme:auto') },
      { type: 'separator' },
      { label: 'Снег', type: 'checkbox', checked: !!i.snow, click: cmd('snow') },
    ] },
    { type: 'separator' },
    { type: 'separator' },
    updateState.state === 'ready'
      ? { label: `Перезапустить и обновить до ${updateState.version}`, click: installUpdate }
      : updateState.state === 'available'
        ? { label: `Обновить до ${updateState.version}`, click: () => { showWindow(); downloadUpdate(); } }
        : updateState.state === 'downloading'
          ? { label: `Обновление скачивается… ${updateState.percent || 0}%`, enabled: false }
          : { label: 'Проверить обновления', enabled: !!updater, click: checkUpdate },
    { label: 'Открыть Grain', click: () => { hideFlyout(); showWindow(); } },
    { label: 'Выход', click: () => { quitting = true; app.quit(); } },
  ]));
}

// ── мини-панель у значка в трее ───────────────────────────────────────────
const FW = 360, FH = 172;
function createFlyout() {
  flyout = new BrowserWindow({
    width: FW, height: FH, show: false, frame: false, resizable: false, movable: false,
    minimizable: false, maximizable: false, fullscreenable: false, skipTaskbar: true, alwaysOnTop: true,
    backgroundColor: '#0c1427', roundedCorners: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  flyout.loadURL((DEV_URL || ORIGIN) + '/?flyout');
  flyout.on('blur', () => hideFlyout());
  flyout.on('closed', () => { flyout = null; });
  flyout.webContents.on('did-finish-load', () => lastInfo && flyout && flyout.webContents.send('flyout:state', lastInfo));
}
function hideFlyout() {
  if (flyout && flyout.isVisible()) { flyout.hide(); flyoutHiddenAt = Date.now(); }
}
function toggleFlyout() {
  if (!flyout) createFlyout();
  if (flyout.isVisible()) return hideFlyout();
  if (Date.now() - flyoutHiddenAt < 250) return; // клик по значку сам закрыл панель через blur
  const cur = screen.getCursorScreenPoint();
  const wa = screen.getDisplayNearestPoint(cur).workArea;
  const x = Math.round(Math.min(Math.max(cur.x - FW / 2, wa.x + 8), wa.x + wa.width - FW - 8));
  const y = cur.y > wa.y + wa.height / 2 ? wa.y + wa.height - FH - 10 : wa.y + 10;
  flyout.setBounds({ x, y, width: FW, height: FH });
  if (lastInfo) flyout.webContents.send('flyout:state', lastInfo);
  flyout.show();
  flyout.focus();
}

// ── глобальные горячие клавиши ────────────────────────────────────────────
function applyHotkeys() {
  globalShortcut.unregisterAll();
  if (!prefs.globalHotkeys) return;
  const map = {
    'Control+Alt+Space': 'toggle',
    'Control+Alt+Right': 'next',
    'Control+Alt+Left': 'prev',
    'Control+Alt+Up': 'volup',
    'Control+Alt+Down': 'voldown',
    'Control+Alt+L': 'like',
  };
  for (const [acc, cmd] of Object.entries(map)) {
    try { globalShortcut.register(acc, () => send('media', cmd)); } catch {}
  }
}

// ── IPC ───────────────────────────────────────────────────────────────────
function ipc() {
  ipcMain.handle('secret:get', () => {
    try {
      if (!fs.existsSync(secretPath)) return null;
      const buf = fs.readFileSync(secretPath);
      const txt = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8');
      return JSON.parse(txt);
    } catch { return null; }
  });
  ipcMain.handle('secret:set', (_e, value) => {
    try {
      if (value == null) { fs.rmSync(secretPath, { force: true }); return true; }
      const txt = JSON.stringify(value);
      const buf = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(txt) : Buffer.from(txt, 'utf8');
      fs.mkdirSync(userDir, { recursive: true });
      fs.writeFileSync(secretPath, buf);
      return true;
    } catch { return false; }
  });
  ipcMain.handle('prefs:set', (_e, p) => {
    prefs = { ...prefs, ...p };
    writeJson(prefsPath, prefs);
    applyHotkeys();
    return prefs;
  });
  ipcMain.handle('prefs:get', () => prefs);
  ipcMain.on('open-external', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });
  ipcMain.on('win:mini', (_e, on) => setMini(!!on));
  ipcMain.on('win:min', () => win && win.minimize());
  ipcMain.on('win:close', () => win && win.close());
  ipcMain.on('win:fullscreen', (_e, on) => win && win.setFullScreen(!!on));
  ipcMain.on('win:max', () => { if (!win) return; win.isMaximized() ? win.unmaximize() : win.maximize(); });
  ipcMain.handle('win:isMax', () => !!win && win.isMaximized());
  ipcMain.on('thumbar', (_e, t) => applyThumbar(t));
  ipcMain.handle('update:get', () => ({ ...updateState, portable: isPortable, version: updateState.version, current: app.getVersion() }));
  ipcMain.on('update:check', () => checkUpdate());
  ipcMain.on('update:download', () => downloadUpdate());
  ipcMain.on('update:install', () => installUpdate());
  ipcMain.on('flyout:cmd', (_e, c) => {
    if (c === 'open') { hideFlyout(); showWindow(); return; }
    if (c === 'mini') { hideFlyout(); showWindow(); setMini(true); return; }
    send('media', c);
  });
  ipcMain.on('nowplaying', (_e, info) => {
    lastInfo = info;
    if (flyout && !flyout.isDestroyed()) flyout.webContents.send('flyout:state', info);
    updateTrayMenu(info);
    if (win) win.setTitle(info && info.title ? `${info.title} — ${info.artist}` : 'Grain');
    if (win && process.platform === 'win32' && info) {
      win.setProgressBar(info.playing && info.progress != null ? info.progress : -1, { mode: info.playing ? 'normal' : 'paused' });
      if (!info.playing) win.setProgressBar(-1);
    }
  });
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    redirectUri: `${ORIGIN}/callback`,
    platform: process.platform,
    widevine: !!components,
  }));
}

// ── старт ─────────────────────────────────────────────────────────────────
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.whenReady().then(async () => {
  prefs = { ...prefs, ...readJson(prefsPath, {}) };
  if (components) {
    try { await components.whenReady(); } catch (e) { console.warn('Widevine:', e && e.message); }
  }
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => {
    cb(['media', 'mediaKeySystem', 'notifications', 'clipboard-sanitized-write', 'fullscreen'].includes(perm));
  });
  try { await startServer(); } catch (e) {
    const { dialog } = require('electron');
    dialog.showErrorBox('Grain', `Порт ${PORT} занят другим приложением. Закройте его и запустите Grain снова.`);
    app.quit();
    return;
  }
  ipc();
  createWindow();
  buildTray();
  applyHotkeys();
  initUpdater();
});

app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
