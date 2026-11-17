import { controls } from '../lib/player';
import { copy, openMenu, router, shareUrl, type Route } from '../lib/ui';
import { bridge } from '../lib/bridge';
import { Cover } from './Cover';
import { I } from './icons';

type Props = { title: string; sub?: React.ReactNode; image?: string; uri: string; route: Route; round?: boolean };

export function MediaCard({ title, sub, image, uri, route, round }: Props) {
  return (
    <div className="card" onClick={() => router.go(route)}
      onContextMenu={(e) => openMenu(e, [
        { label: 'Играть', run: () => controls.playContext(uri) },
        { label: 'Открыть', run: () => router.go(route) },
        { sep: true },
        { label: 'Скопировать ссылку', run: () => copy(shareUrl(uri)) },
        { label: 'Открыть в Spotify', run: () => bridge.openExternal(shareUrl(uri)) },
      ])}>
      <div className="card-art">
        <Cover src={image} round={round} />
        <button className="card-play" onClick={(e) => { e.stopPropagation(); controls.playContext(uri); }} aria-label={`Играть ${title}`}>
          <I.play size={18} />
        </button>
      </div>
      <div className="card-title" title={title}>{title}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  );
}

export function Shelf({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="shelf">
      <div className="shelf-head"><h2>{title}</h2>{action}</div>
      <div className="grid">{children}</div>
    </section>
  );
}
