import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { onDataChange } from '@/db/events';
import { getSetting, listPeople, setSetting, type Person } from '@/db/repo';
import { strings } from '@/i18n/strings';

const SETTING = 'activePersonId';

type ActivePersonContext = {
  /** Everyone in the app, "Me" first. */
  people: Person[];
  /** The profile whose medicines, checkups and doctors are shown. */
  person: Person | null;
  setActive: (id: string) => Promise<void>;
};

const Ctx = createContext<ActivePersonContext>({ people: [], person: null, setActive: async () => {} });

/** The name to show for a person: "Me" for the user's own profile. */
export const displayName = (p: Pick<Person, 'isSelf' | 'name'>) => (p.isSelf ? strings.people.me : p.name);

/**
 * Remembers which profile is being viewed, so Today and the Medications tab show only that
 * person's data. Reminders still cover everyone. Falls back to "Me" if the chosen person is removed.
 */
export function ActivePersonProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ppl, saved] = await Promise.all([listPeople(), getSetting<string | null>(SETTING, null)]);
    setPeople(ppl);
    setActiveId(saved);
  }, []);

  useEffect(() => {
    load().catch(() => {});
    return onDataChange(() => void load().catch(() => {}));
  }, [load]);

  const setActive = useCallback(async (id: string) => {
    setActiveId(id);
    await setSetting(SETTING, id);
  }, []);

  const value = useMemo(() => {
    const person = people.find((p) => p.id === activeId) ?? people.find((p) => p.isSelf) ?? people[0] ?? null;
    return { people, person, setActive };
  }, [people, activeId, setActive]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useActivePerson = () => useContext(Ctx);
