import { bridge, isDesktop, type UpdateState } from './bridge';
import { createStore } from './store';
import { toast } from './ui';

/** Состояние встроенного обновления (приходит из главного процесса). */
export const updates = createStore<UpdateState>({ state: 'idle' });

export const update = {
  check: () => bridge.checkUpdate(),
  download: () => bridge.downloadUpdate(),
  install: () => bridge.installUpdate(),
};

export function initUpdates() {
  if (!isDesktop) return;
  bridge.getUpdate().then((s) => updates.set(s));
  bridge.onUpdate((s) => {
    const prev = updates.get().state;
    updates.set(s);
    if (s.state === 'available' && prev !== 'available') {
      toast(`Вышла новая версия Grain ${s.version}`, { label: s.portable ? 'Скачать' : 'Обновить', run: update.download });
    }
    if (s.state === 'ready' && prev !== 'ready') {
      toast(`Обновление ${s.version} скачано`, { label: 'Перезапустить', run: update.install });
    }
    if (s.state === 'error' && prev === 'downloading') toast(`Не удалось обновиться: ${s.error}`);
  });
}
