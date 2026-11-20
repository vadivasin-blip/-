import { useEffect, useState } from 'react';
import { bridge, type NetTest, type ProxyPrefs } from '../lib/bridge';

const DEFAULT: ProxyPrefs = { mode: 'system', type: 'socks5', host: '127.0.0.1', port: '' };

/**
 * Сеть Grain: как в системе / свой прокси / напрямую. Весь трафик Grain (вход, API, музыка, обновления)
 * идёт через выбранный путь — браузер и остальные программы это не затрагивает.
 */
export function NetworkPanel({ compact }: { compact?: boolean }) {
  const [p, setP] = useState<ProxyPrefs>(DEFAULT);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<NetTest | null>(null);
  const [saved, setSaved] = useState<ProxyPrefs>(DEFAULT);
  useEffect(() => { bridge.getPrefs().then((x) => { const v = { ...DEFAULT, ...(x.proxy || {}) }; setP(v); setSaved(v); }); }, []);
  const dirty = JSON.stringify(p) !== JSON.stringify(saved);
  const portOk = p.mode !== 'custom' || /^\d{2,5}$/.test(p.port.trim());

  const apply = async () => {
    setBusy(true); setRes(null);
    try {
      const v = { ...p, host: p.host.trim() || '127.0.0.1', port: p.port.trim() };
      await bridge.setPrefs({ proxy: v });
      setSaved(v); setP(v);
      setRes(await bridge.testNetwork());
    } finally { setBusy(false); }
  };

  const line = (name: string, r?: NetTest['accounts']) => r && (
    <div className={`net-res ${r.ok ? 'ok' : 'bad'}`}>
      <span>{r.ok ? '✓' : '✗'}</span><b>{name}</b>
      <span className="muted">{r.ok ? `открывается${r.ms ? `, ${r.ms} мс` : ''}` : `не открывается${r.error ? ` — ${r.error}` : r.status ? ` (код ${r.status})` : ''}`}</span>
    </div>
  );

  return (
    <div className={`netpanel ${compact ? 'compact' : ''}`}>
      <div className="seg small">
        {([['system', 'Как в Windows'], ['custom', 'Свой прокси'], ['direct', 'Напрямую']] as const).map(([k, l]) => (
          <button key={k} className={p.mode === k ? 'on' : ''} onClick={() => setP({ ...p, mode: k })}>{l}</button>
        ))}
      </div>
      {p.mode === 'system' && <p className="net-hint">Grain ходит в интернет так же, как Windows. Если VPN включён «для всей системы», этого достаточно.</p>}
      {p.mode === 'direct' && <p className="net-hint">Без прокси и системных настроек — напрямую.</p>}
      {p.mode === 'custom' && (
        <>
          <div className="net-fields">
            <select value={p.type} onChange={(e) => setP({ ...p, type: e.target.value as ProxyPrefs['type'] })}>
              <option value="socks5">SOCKS5</option>
              <option value="http">HTTP</option>
              <option value="socks4">SOCKS4</option>
            </select>
            <input value={p.host} onChange={(e) => setP({ ...p, host: e.target.value })} placeholder="127.0.0.1" spellCheck={false} className="mono" />
            <span className="muted">:</span>
            <input value={p.port} onChange={(e) => setP({ ...p, port: e.target.value.replace(/\D/g, '') })} placeholder="порт" spellCheck={false} className="mono port" />
          </div>
          <p className="net-hint">
            Адрес и порт смотрите в настройках VPN-клиента: раздел «Прокси», «Локальный порт» или «Inbound».
            Часто это 127.0.0.1 и порт 10808 (v2rayN), 2080 (NekoBox), 7890 (Clash) или 12334 (Hiddify).
            Через прокси пойдёт только Grain — браузер и другие программы это не затронет.
          </p>
        </>
      )}
      <div className="net-actions">
        <button className="btn primary" disabled={busy || !portOk} onClick={apply}>{busy ? 'Проверяю…' : dirty ? 'Сохранить и проверить' : 'Проверить связь со Spotify'}</button>
      </div>
      {res && (
        <div className="net-results">
          {line('Вход Spotify', res.accounts)}
          {line('Spotify API', res.api)}
          {!res.accounts.ok && (
            <p className="net-hint">
              {p.mode === 'custom'
                ? 'Прокси не пропускает Spotify: проверьте, что VPN-клиент запущен, адрес и порт верные, а тип совпадает (SOCKS5 или HTTP).'
                : 'Spotify отсюда недоступен. Включите VPN для всей системы или укажите прокси VPN-клиента в режиме «Свой прокси».'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
