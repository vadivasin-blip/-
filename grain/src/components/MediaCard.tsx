import { controls, player } from '../lib/player';
import { useStore } from '../lib/store';
import { copy, openMenu, router, shareUrl, type Route } from '../lib/ui';
import { bridge } from '../lib/bridge';
import { Cover } from './Cover';
import { I } from './icons';
import { Vinyl } from './Vinyl';

type Props = { title: string; sub?: React.ReactNode; image?: string; uri: string; route: Route; round?: boolean };

/**
 * Карточка-конверт: при наведении пластинка выезжает из конверта.
 * Исполнители показываются как picture disc — фото прямо на виниле.
 */
export function MediaCard({ title, sub, image, uri, route, round }: Props) {
  const current = useStore(player, (s) => s.contextUri === uri);
  const playing = useStore(player, (s) => s.playing);
  const menu = (e: React.MouseEvent) => openMenu(e, [
    { label: 'Играть', run: () => controls.playContext(uri) },
    { label: 'Открыть', run: () => router.go(route) },
    { sep: true },
    { label: 'Скопировать ссылку', run: () => copy(shareUrl(uri)) },
    { label: 'Открыть в Spotify', run: () => bridge.openExternal(shareUrl(uri)) },
  ]);
  const play = (e: React.MouseEvent) => { e.stopPropagation(); current ? controls.toggle() : controls.playContext(uri); };

  if (round) {
    return (
      <div className={`card picture ${current ? 'current' : ''}`} onClick={() => router.go(route)} onContextMenu={menu}>
        <div className="picture-disc">
          <Cover src={image} round />
          <span className="picture-grooves" />
          <span className="picture-hole" />
          <button className="card-play" onClick={play} aria-label={`Играть ${title}`}>{current && playing ? <I.pause size={16} /> : <I.play size={16} />}</button>
        </div>
        <div className="card-title" title={title}>{title}</div>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
    );
  }
  return (
    <div className={`card sleeve-card ${current ? 'current' : ''}`} onClick={() => router.go(route)} onContextMenu={menu}>
      <div className="sleeve">
        <Vinyl src={image} spinning={current && playing} className="sleeve-vinyl" />
        <div className="sleeve-cover"><Cover src={image} /></div>
        <button className="card-play" onClick={play} aria-label={`Играть ${title}`}>{current && playing ? <I.pause size={16} /> : <I.play size={16} />}</button>
      </div>
      <div className="card-title" title={title}>{title}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  );
}

export function Shelf({ title, children, action, kicker }: { title: string; children: React.ReactNode; action?: React.ReactNode; kicker?: string }) {
  return (
    <section className="shelf">
      <div className="shelf-head">
        <div>{kicker && <div className="kicker">{kicker}</div>}<h2>{title}</h2></div>
        {action}
      </div>
      <div className="grid">{children}</div>
    </section>
  );
}
