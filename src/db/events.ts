/** A tiny change bus. Repositories call `notifyChange()` after a write, and screens re-query. */
type Listener = () => void;
const listeners = new Set<Listener>();

export function onDataChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyChange() {
  listeners.forEach((fn) => fn());
}
