import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { onDataChange } from '@/db/events';

/**
 * Loads data and loads it again whenever the database changes or the screen regains focus.
 * Pass a stable `deps` array the way you would for useEffect.
 */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => {
    let alive = true;
    loaderRef
      .current()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(reload);
  useEffect(() => onDataChange(() => void reload()), [reload]);

  return { data, error, reload, loading: data === undefined && !error };
}

/** Re-renders every minute so time-based statuses such as due and overdue stay current. */
export function useMinuteTick(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
