/** Шина праздничных эффектов: снежные «пуфы» и салют рисует общий холст снега. */
type Ev = { type: 'puff'; x: number; y: number; n?: number } | { type: 'fireworks'; seconds?: number };
const subs = new Set<(e: Ev) => void>();
export const fx = {
  on(fn: (e: Ev) => void) { subs.add(fn); return () => { subs.delete(fn); }; },
  puff(x: number, y: number, n = 12) { subs.forEach((f) => f({ type: 'puff', x, y, n })); },
  fireworks(seconds = 12) { subs.forEach((f) => f({ type: 'fireworks', seconds })); },
};
export type { Ev as FxEvent };
