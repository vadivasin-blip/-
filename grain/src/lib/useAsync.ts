import { useEffect, useRef, useState } from 'react';

const cache = new Map<string, { at: number; value: any }>();
const TTL = 5 * 60_000;

export function invalidate(prefix: string) {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
}

/** Загрузка с кэшем по ключу: возврат «назад» — мгновенный, в фоне обновляем. */
export function useAsync<T>(key: string | null, fn: () => Promise<T>) {
  const hit = key ? cache.get(key) : undefined;
  const [state, setState] = useState<{ data: T | undefined; error: Error | null; loading: boolean }>({
    data: hit?.value, error: null, loading: !hit,
  });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const h = cache.get(key);
    setState({ data: h?.value, error: null, loading: !h });
    if (h && Date.now() - h.at < TTL && nonce === 0) return;
    fnRef.current().then(
      (value) => { cache.set(key, { at: Date.now(), value }); if (alive) setState({ data: value, error: null, loading: false }); },
      (error) => { if (alive) setState((s) => ({ data: s.data, error, loading: false })); },
    );
    return () => { alive = false; };
  }, [key, nonce]);

  return { ...state, reload: () => { if (key) cache.delete(key); setNonce((n) => n + 1); } };
}
