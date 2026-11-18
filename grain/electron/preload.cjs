'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const on = (ch) => (cb) => {
  const h = (_e, v) => cb(v);
  ipcRenderer.on(ch, h);
  return () => ipcRenderer.removeListener(ch, h);
};

contextBridge.exposeInMainWorld('grain', {
  getSecret: () => ipcRenderer.invoke('secret:get'),
  setSecret: (v) => ipcRenderer.invoke('secret:set', v),
  getPrefs: () => ipcRenderer.invoke('prefs:get'),
  setPrefs: (p) => ipcRenderer.invoke('prefs:set', p),
  info: () => ipcRenderer.invoke('app:info'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  setMini: (on) => ipcRenderer.send('win:mini', on),
  minimize: () => ipcRenderer.send('win:min'),
  close: () => ipcRenderer.send('win:close'),
  setFullscreen: (on) => ipcRenderer.send('win:fullscreen', on),
  toggleMax: () => ipcRenderer.send('win:max'),
  isMaximized: () => ipcRenderer.invoke('win:isMax'),
  onWinState: on('win:state'),
  thumbar: (t) => ipcRenderer.send('thumbar', t),
  nowPlaying: (info) => ipcRenderer.send('nowplaying', info),
  onAuth: on('auth:callback'),
  onMedia: on('media'),
  onNav: on('nav'),
  onMini: on('win:mini'),
  onFlyout: on('flyout:state'),
  flyoutCmd: (c) => ipcRenderer.send('flyout:cmd', c),
});
