import { useMemo, useState } from 'react';
import { api } from '../lib/spotify';
import { isOwn, libraryStore, reloadPlaylists } from '../lib/library';
import { useStore } from '../lib/store';
import { router, toast, ui, plural } from '../lib/ui';
import { invalidate } from '../lib/useAsync';
import { img, playlistTotal } from '../lib/types';
import { Cover } from './Cover';
import { I } from './icons';
import { Modal } from './Overlays';

export const createPlaylistFlow = () => ui.set({ addTo: { uris: [], label: '' } });

export function AddToPlaylist() {
  const req = useStore(ui, (s) => s.addTo);
  const playlists = useStore(libraryStore, (s) => s.playlists);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const own = useMemo(() => playlists.filter(isOwn).filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())), [playlists, q]);
  if (!req) return null;
  const close = () => { ui.set({ addTo: null }); setQ(''); setName(''); };
  const createOnly = req.uris.length === 0;

  const add = async (id: string, plName: string) => {
    setBusy(true);
    try {
      await api.addToPlaylist(id, req.uris);
      invalidate(`pl:${id}`);
      toast(`Добавлено в «${plName}»`, { label: 'Открыть', run: () => router.go({ name: 'playlist', id }) });
      close();
    } catch (e) { toast(`Не удалось: ${(e as Error).message}`); }
    setBusy(false);
  };

  const create = async () => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const pl = await api.createPlaylist(n);
      if (req.uris.length) await api.addToPlaylist(pl.id, req.uris);
      await reloadPlaylists();
      toast(`Плейлист «${n}» создан`);
      close();
      router.go({ name: 'playlist', id: pl.id });
    } catch (e) { toast(`Не удалось создать: ${(e as Error).message}`); }
    setBusy(false);
  };

  return (
    <Modal title={createOnly ? 'Новый плейлист' : `Добавить «${req.label}»`} onClose={close}>
      <form className="new-pl" onSubmit={(e) => { e.preventDefault(); create(); }}>
        <input autoFocus={createOnly} value={name} onChange={(e) => setName(e.target.value)} placeholder="Название нового плейлиста" maxLength={100} />
        <button className="btn primary" disabled={!name.trim() || busy}><I.plus size={15} /> Создать</button>
      </form>
      {!createOnly && (
        <>
          <label className="tl-filter wide">
            <I.search size={14} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти среди ваших плейлистов" />
          </label>
          <div className="pl-pick">
            {own.map((p) => (
              <button key={p.id} className="pop-item" disabled={busy} onClick={() => add(p.id, p.name)}>
                <Cover src={img(p.images, 64)} size={36} />
                <span className="grow">{p.name}<small>{plural(playlistTotal(p), 'трек', 'трека', 'треков')}</small></span>
              </button>
            ))}
            {!own.length && <div className="pop-note">Подходящих плейлистов нет — создайте новый выше.</div>}
          </div>
        </>
      )}
    </Modal>
  );
}
