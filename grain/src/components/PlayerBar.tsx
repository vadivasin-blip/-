import { useCallback, useRef, useState } from 'react';
import { api } from '../lib/spotify';
import { controls, player, sleep } from '../lib/player';
import { useStore } from '../lib/store';
import { usePosition, useClickOutside } from '../lib/hooks';
import { fmt, router, ui, type Panel } from '../lib/ui';
import { img, artistsLine, type Device } from '../lib/types';
import { bridge } from '../lib/bridge';
import { Cover } from './Cover';
import { I } from './icons';
import { Slider } from './Slider';

export function PlayerBar() {
  const track = useStore(player, (s) => s.track);
  const liked = useStore(player, (s) => s.liked);
  return (
    <footer className="playerbar">
      <div className="pb-left">
        {track ? (
          <>
            <button className="pb-cover" onClick={() => ui.set({ fullscreen: true })} title="Экран «Сейчас играет» (F)">
              <Cover src={img(track.album?.images, 120)} size={52} />
              <span className="pb-cover-hint"><I.expand size={16} /></span>
            </button>
            <div className="pb-meta">
              <a className="pb-title" onClick={() => track.album?.id && router.go({ name: 'album', id: track.album.id })} title={track.name}>{track.name}</a>
              <div className="pb-artists">
                {track.artists.map((a, i) => (
                  <span key={a.id || i}>{i > 0 && ', '}<a onClick={() => a.id && router.go({ name: 'artist', id: a.id })}>{a.name}</a></span>
                ))}
              </div>
            </div>
            <button className={`icon-btn like ${liked ? 'on' : ''}`} onClick={controls.toggleLike} title={liked ? 'Убрать из «Любимых» (L)' : 'В «Любимые» (L)'}>
              {liked ? <I.heartFill size={18} /> : <I.heart size={18} />}
            </button>
          </>
        ) : (
          <div className="pb-empty">Ничего не играет</div>
        )}
      </div>
      <div className="pb-center">
        <Transport />
        <Progress />
      </div>
      <div className="pb-right">
        <SleepButton />
        <PanelButton panel="lyrics" title="Текст песни (Ctrl+L)"><I.lyrics size={18} /></PanelButton>
        <PanelButton panel="queue" title="Очередь (Ctrl+Q)"><I.queue size={18} /></PanelButton>
        <DeviceButton />
        <Volume />
        <button className="icon-btn" title="Мини-плеер (Ctrl+M)" onClick={() => bridge.setMini(true)}><I.mini size={18} /></button>
      </div>
    </footer>
  );
}

export function Transport({ small }: { small?: boolean }) {
  const s = useStore(player, (s) => ({ playing: s.playing, shuffle: s.shuffle, repeat: s.repeat }));
  return (
    <div className={`transport ${small ? 'small' : ''}`}>
      {!small && (
        <button className={`icon-btn toggle ${s.shuffle ? 'on' : ''}`} onClick={controls.toggleShuffle} title="Перемешать (S)"><I.shuffle size={17} /></button>
      )}
      <button className="icon-btn" onClick={controls.prev} title="Назад (Ctrl+←)"><I.prev size={18} /></button>
      <button className="play-btn" onClick={controls.toggle} title="Играть/пауза (Пробел)">
        {s.playing ? <I.pause size={small ? 16 : 18} /> : <I.play size={small ? 16 : 18} />}
      </button>
      <button className="icon-btn" onClick={controls.next} title="Вперёд (Ctrl+→)"><I.next size={18} /></button>
      {!small && (
        <button className={`icon-btn toggle ${s.repeat !== 'off' ? 'on' : ''}`} onClick={controls.cycleRepeat}
          title={s.repeat === 'off' ? 'Повтор выкл. (R)' : s.repeat === 'context' ? 'Повтор списка (R)' : 'Повтор трека (R)'}>
          <I.repeat size={17} />
          {s.repeat === 'track' && <span className="badge-1">1</span>}
        </button>
      )}
    </div>
  );
}

export function Progress({ bare }: { bare?: boolean }) {
  const { pos, duration } = usePosition(5);
  const [remain, setRemain] = useState(() => localStorage.getItem('grain.remain') === '1');
  const frac = duration ? pos / duration : 0;
  const slider = (
    <Slider value={frac} ariaLabel="Позиция" className="seek" label={(v) => fmt(v * duration)} step={0.01}
      onCommit={(v) => duration && controls.seek(v * duration)} />
  );
  if (bare) return slider;
  return (
    <div className="progress">
      <span className="time mono">{fmt(pos)}</span>
      {slider}
      <button className="time mono end" title="Показать оставшееся время"
        onClick={() => { setRemain(!remain); localStorage.setItem('grain.remain', remain ? '0' : '1'); }}>
        {remain ? `−${fmt(duration - pos)}` : fmt(duration)}
      </button>
    </div>
  );
}

function Volume() {
  const { volume, muted } = useStore(player, (s) => ({ volume: s.volume, muted: s.muted }));
  const v = muted ? 0 : volume;
  const Icon = v === 0 ? I.mute : v < 45 ? I.volLow : I.vol;
  return (
    <div className="volume">
      <button className="icon-btn" onClick={controls.toggleMute} title={muted ? 'Включить звук (M)' : 'Без звука (M)'}><Icon size={18} /></button>
      <Slider value={v / 100} ariaLabel="Громкость" className="vol" label={(x) => `${Math.round(x * 100)}%`} step={0.05}
        onChange={(x) => player.set({ volume: Math.round(x * 100), muted: false })}
        onCommit={(x) => controls.setVolume(x * 100)} />
    </div>
  );
}

function PanelButton({ panel, title, children }: { panel: Panel; title: string; children: React.ReactNode }) {
  const cur = useStore(ui, (s) => s.panel);
  return (
    <button className={`icon-btn toggle ${cur === panel ? 'on' : ''}`} title={title} onClick={() => ui.set({ panel: cur === panel ? null : panel })}>
      {children}
    </button>
  );
}

const deviceIcon = (type: string) => (type === 'Smartphone' ? I.phone : type === 'Speaker' || type === 'CastAudio' ? I.speaker : I.device);

function DeviceButton() {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { device, sdk, sdkError, sdkDeviceId } = useStore(player, (s) => ({ device: s.device, sdk: s.sdk, sdkError: s.sdkError, sdkDeviceId: s.sdkDeviceId }));
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);
  const remote = device && device.id !== sdkDeviceId;

  const toggle = async () => {
    if (open) return setOpen(false);
    setOpen(true);
    setDevices(null);
    try { setDevices((await api.devices()).devices); } catch { setDevices([]); }
  };

  return (
    <div className="popover-wrap" ref={ref}>
      <button className={`icon-btn toggle ${remote ? 'on' : ''}`} onClick={toggle} title="Устройство воспроизведения">
        <I.device size={18} />
      </button>
      {remote && <span className="device-pill" onClick={toggle}>{device!.name}</span>}
      {open && (
        <div className="popover devices">
          <div className="pop-title">Где играть</div>
          {devices === null && <div className="pop-note"><span className="spinner" /> Ищу устройства…</div>}
          {devices?.map((d) => {
            const Icon = deviceIcon(d.type);
            return (
              <button key={d.id} className={`pop-item ${d.is_active ? 'active' : ''}`} onClick={() => { controls.transfer(d.id); setOpen(false); }}>
                <Icon size={18} />
                <span className="grow">{d.id === sdkDeviceId ? 'Этот компьютер — Grain' : d.name}<small>{d.is_active ? 'играет сейчас' : d.type}</small></span>
                {d.is_active && <I.check size={16} />}
              </button>
            );
          })}
          {devices && !devices.length && <div className="pop-note">Устройств нет. Откройте Spotify на телефоне или ПК.</div>}
          {sdk === 'error' && <div className="pop-note warn">{sdkError}</div>}
          {sdk === 'loading' && <div className="pop-note">Встроенный плеер подключается…</div>}
        </div>
      )}
    </div>
  );
}

function SleepButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { sleepAt, sleepEndOfTrack } = useStore(player, (s) => ({ sleepAt: s.sleepAt, sleepEndOfTrack: s.sleepEndOfTrack }));
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);
  const active = !!sleepAt || sleepEndOfTrack;
  const left = sleepAt ? Math.max(1, Math.round((sleepAt - Date.now()) / 60000)) : 0;
  const pick = (m: number | 'track' | null) => { sleep.set(m); setOpen(false); };
  return (
    <div className="popover-wrap" ref={ref}>
      <button className={`icon-btn toggle ${active ? 'on' : ''}`} onClick={() => setOpen(!open)} title="Таймер сна">
        <I.moon size={17} />
        {sleepAt && <span className="badge-1 wide mono">{left}</span>}
      </button>
      {open && (
        <div className="popover sleep">
          <div className="pop-title">Таймер сна</div>
          {[10, 20, 30, 45, 60, 90].map((m) => (
            <button key={m} className="pop-item" onClick={() => pick(m)}><span className="grow">{m} минут</span></button>
          ))}
          <button className={`pop-item ${sleepEndOfTrack ? 'active' : ''}`} onClick={() => pick('track')}><span className="grow">В конце трека</span></button>
          {active && <button className="pop-item danger" onClick={() => pick(null)}><span className="grow">Выключить{sleepAt ? ` (осталось ${left} мин)` : ''}</span></button>}
        </div>
      )}
    </div>
  );
}

export const nowLine = () => {
  const t = player.get().track;
  return t ? `${t.name} — ${artistsLine(t.artists)}` : '';
};
