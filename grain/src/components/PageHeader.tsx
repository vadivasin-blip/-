import { useEffect, useState } from 'react';
import { coverColor } from '../lib/color';
import { Cover } from './Cover';

export function PageHeader({ image, kind, title, meta, round, children, desc }: {
  image?: string; kind: string; title: string; meta?: React.ReactNode; round?: boolean; children?: React.ReactNode; desc?: string;
}) {
  const [tint, setTint] = useState<string | null>(null);
  useEffect(() => { let a = true; coverColor(image).then((c) => a && setTint(c)); return () => { a = false; }; }, [image]);
  const len = title.length;
  return (
    <header className="page-head" style={tint ? ({ '--tint': tint } as React.CSSProperties) : undefined}>
      <Cover src={image} className={`ph-cover ${round ? 'round' : ''}`} round={round} />
      <div className="ph-text">
        <div className="ph-kind">{kind}</div>
        <h1 className={len > 40 ? 'long' : len > 22 ? 'mid' : ''}>{title}</h1>
        {desc && <p className="ph-desc" dangerouslySetInnerHTML={{ __html: sanitize(desc) }} />}
        {meta && <div className="ph-meta">{meta}</div>}
      </div>
      {children && <div className="ph-actions">{children}</div>}
    </header>
  );
}

/** Описания плейлистов приходят с HTML-сущностями и ссылками — оставляем только текст. */
function sanitize(s: string) {
  const d = document.createElement('div');
  d.innerHTML = s;
  return (d.textContent || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!));
}

export function Loading({ label = 'Загрузка…' }: { label?: string }) {
  return <div className="loading"><span className="spinner" /> {label}</div>;
}

export function ErrorBox({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <div className="errorbox">
      <b>Не получилось загрузить</b>
      <span>{error.message}</span>
      {retry && <button className="btn" onClick={retry}>Повторить</button>}
    </div>
  );
}
