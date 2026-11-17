import { useState } from 'react';
import { I } from './icons';

export function Cover({ src, size, round, alt = '', className = '' }: { src?: string; size?: number; round?: boolean; alt?: string; className?: string }) {
  const [ok, setOk] = useState(true);
  const style = size ? { width: size, height: size } : undefined;
  return (
    <span className={`cover ${round ? 'round' : ''} ${className}`} style={style}>
      {src && ok ? <img src={src} alt={alt} loading="lazy" draggable={false} onError={() => setOk(false)} /> : <I.disc size={size ? Math.max(16, size * 0.36) : 28} />}
    </span>
  );
}
