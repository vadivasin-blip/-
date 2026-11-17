import { useEffect, useState } from 'react';
import { coverColor } from '../lib/color';
import { Cover } from './Cover';
import { Vinyl } from './Vinyl';
import { player } from '../lib/player';
import { useStore } from '../lib/store';

export function PageHeader({ image, kind, title, meta, round, children, desc, uri, art }: {
  image?: string; kind: string; title: string; meta?: React.ReactNode; round?: boolean; children?: React.ReactNode; desc?: string;
  uri?: string; art?: React.ReactNode;
}) {
  const spinning = useStore(player, (s) => !!uri && s.contextUri === uri && s.playing);
  const isCur = useStore(player, (s) => !!uri && s.contextUri === uri);
  const [tint, setTint] = useState<string | null>(null);
  useEffect(() => { let a = true; coverColor(image).then((c) => a && setTint(c)); return () => { a = false; }; }, [image]);
  const len = title.length;
  return (
    <header className={`page-head ${isCur ? 'is-current' : ''}`} style={tint ? ({ '--tint': tint } as React.CSSProperties) : undefined}>
      {art ?? (round ? (
        <div className="ph-art picture-disc big">
          <Cover src={image} round />
          <span className="picture-grooves" />
          <span className="picture-hole" />
        </div>
      ) : (
        <div className="ph-art sleeve big">
          <Vinyl src={image} spinning={spinning} className="sleeve-vinyl" />
          <div className="sleeve-cover"><Cover src={image} /></div>
        </div>
      ))}
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
