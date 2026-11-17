import { useCallback, useRef, useState } from 'react';
import { Knob } from './Knob';
import { api } from '../lib/spotify';
import { controls, player, sleep } from '../lib/player';
import { useStore } from '../lib/store';
import { usePosition, useClickOutside } from '../lib/hooks';
import { fmt } from '../lib/ui';
import { artistsLine, type Device } from '../lib/types';
import { I } from './icons';
import { Slider } from './Slider';

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

const deviceIcon = (type: string) => (type === 'Smartphone' ? I.phone : type === 'Speaker' || type === 'CastAudio' ? I.speaker : I.device);

export function DeviceButton() {
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

export function SleepButton() {
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

export function VolumeKnob() {
  const { volume, muted } = useStore(player, (s) => ({ volume: s.volume, muted: s.muted }));
  return (
    <Knob value={(muted ? 0 : volume) / 100} label="Громкость"
      onChange={(x) => player.set({ volume: Math.round(x * 100), muted: false })}
      onCommit={(x) => controls.setVolume(x * 100)} onDouble={controls.toggleMute} />
  );
}
