import { useSyncExternalStore, useRef } from 'react';

export type Store<T> = {
  get: () => T;
  set: (patch: Partial<T> | ((s: T) => Partial<T>)) => void;
  subscribe: (fn: () => void) => () => void;
};

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      let changed = false;
      for (const k in p) if ((p as any)[k] !== (state as any)[k]) { changed = true; break; }
      if (!changed) return;
      state = { ...state, ...p };
      subs.forEach((f) => f());
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

/** Подписка на срез состояния; перерисовка только при изменении среза (поверхностное сравнение). */
export function useStore<T extends object, S>(store: Store<T>, sel: (s: T) => S): S {
  const last = useRef<{ v: S } | null>(null);
  return useSyncExternalStore(store.subscribe, () => {
    const next = sel(store.get());
    if (last.current && shallow(last.current.v, next)) return last.current.v;
    last.current = { v: next };
    return next;
  });
}

function shallow(a: any, b: any) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!Object.is(a[k], b[k])) return false;
  return true;
}
