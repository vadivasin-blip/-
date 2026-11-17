import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { toasts, ui } from '../lib/ui';
import { I } from './icons';

export function ContextMenu() {
  const menu = useStore(ui, (s) => s.menu);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const close = useCallback(() => ui.set({ menu: null }), []);

  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({
      x: Math.min(menu.x, window.innerWidth - r.width - 8),
      y: Math.min(menu.y, window.innerHeight - r.height - 8),
    });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    window.addEventListener('blur', close);
    document.querySelector('.main-scroll')?.addEventListener('scroll', close, { once: true });
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); window.removeEventListener('blur', close); };
  }, [menu, close]);

  if (!menu) return null;
  return (
    <div className="ctxmenu" ref={ref} style={{ left: pos.x, top: pos.y }} onContextMenu={(e) => e.preventDefault()}>
      {menu.items.map((it, i) =>
        'sep' in it ? <div key={i} className="sep" /> : (
          <button key={i} className={`ctx-item ${it.danger ? 'danger' : ''}`} disabled={it.disabled}
            onClick={() => { close(); it.run(); }}>
            <span>{it.label}</span>{it.hint && <kbd>{it.hint}</kbd>}
          </button>
        ))}
    </div>
  );
}

export function Toasts() {
  const list = useStore(toasts, (s) => s.list);
  return (
    <div className="toasts" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
          {t.action && <button className="link-btn" onClick={t.action.run}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn xs" onClick={onClose} aria-label="Закрыть"><I.close size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const KEYS: [string, string][] = [
  ['Пробел', 'Играть / пауза'],
  ['Ctrl → / Ctrl ←', 'Следующий / предыдущий трек'],
  ['→ / ←', 'Перемотка на 5 секунд'],
  ['Shift → / Shift ←', 'Перемотка на 30 секунд'],
  ['↑ / ↓', 'Громкость'],
  ['M', 'Без звука'],
  ['L', 'Нравится (текущий трек или выбранная строка)'],
  ['S / R', 'Перемешать / повтор'],
  ['Q', 'В очередь (выбранная строка)'],
  ['F', 'Экран «Сейчас играет»'],
  ['Ctrl K', 'Поиск и команды'],
  ['Ctrl F', 'Фильтр по текущему списку'],
  ['Ctrl L / Ctrl Q', 'Текст песни / очередь'],
  ['Ctrl M', 'Мини-плеер'],
  ['Ctrl 1–4', 'Главная, поиск, медиатека, статистика'],
  ['Alt ← / Alt →', 'Назад / вперёд'],
  ['Ctrl Alt Пробел / → / ←', 'Глобально, даже из других окон'],
];

export function Shortcuts() {
  const open = useStore(ui, (s) => s.shortcuts);
  if (!open) return null;
  return (
    <Modal title="Горячие клавиши" onClose={() => ui.set({ shortcuts: false })} wide>
      <div className="keys">
        {KEYS.map(([k, d]) => (
          <div key={k} className="key-row"><span className="key-desc">{d}</span><span className="key-k">{k.split(' / ').map((x, i) => <span key={i}>{i > 0 && <i>/</i>}<kbd>{x}</kbd></span>)}</span></div>
        ))}
      </div>
    </Modal>
  );
}
