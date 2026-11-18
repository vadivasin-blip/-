import { useStore } from '../lib/store';
import { update, updates } from '../lib/updates';
import { router } from '../lib/ui';

/** Кнопка в верхней панели, когда есть новая версия: скачать → прогресс → перезапустить. */
export function UpdatePill() {
  const s = useStore(updates, (x) => x);
  if (s.state === 'available') {
    return <button className="update-pill" onClick={update.download} title="Что нового — в настройках">↑ Обновить до {s.version}</button>;
  }
  if (s.state === 'downloading') {
    return (
      <button className="update-pill busy" onClick={() => router.go({ name: 'settings' })} title="Обновление скачивается">
        <i style={{ width: `${s.percent || 0}%` }} /><span>Скачиваю {s.percent || 0}%</span>
      </button>
    );
  }
  if (s.state === 'ready') {
    return <button className="update-pill ready" onClick={update.install}>Перезапустить и обновить</button>;
  }
  return null;
}
