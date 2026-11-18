import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

import { localToday } from '@/domain/dates';
import { planDoseNotifications, type PlanInput } from '@/domain/notificationPlan';
import { dosesForDay } from '@/domain/schedule';
import { getGlobalMealTimes, listDoseEvents, listMedications, listPeople, logDose } from '@/db/repo';
import { onDataChange } from '@/db/events';
import { applyDosePlan, DOSE_CATEGORY, DOSE_CHANNEL } from './notifications';

const SNOOZE_MINUTES = 10;

function minuteOf(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Rebuilds the rolling window of dose reminders from the database. It skips doses already
 * logged today, so a Taken dose never sends a reminder.
 */
export async function replanReminders() {
  const [people, meds, globalMeals] = await Promise.all([listPeople(), listMedications(), getGlobalMealTimes()]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const today = localToday();
  const logged = new Set((await listDoseEvents(today)).filter((e) => e.status !== 'snoozed').map((e) => `${e.medicationId}:${e.slotIndex}`));

  const inputs: PlanInput[] = meds
    .filter((m) => m.active && byId.has(m.personId))
    .map((m) => ({
      medicationId: m.id,
      personId: m.personId,
      schedule: m.schedule,
      meals: byId.get(m.personId)?.mealTimes ?? globalMeals,
    }));

  const plan = planDoseNotifications(inputs, today, minuteOf(new Date())).filter(
    (p) => !(p.date === today && logged.has(`${p.medicationId}:${p.slotIndex}`)),
  );

  await applyDosePlan(plan, (id) => {
    const p = byId.get(id);
    return !p || p.isSelf ? 'Time for your medicine' : `Time for ${p.name}'s medicine`;
  });
}

/** Schedules a single one-off reminder N minutes from now for a snoozed dose. */
export async function scheduleSnooze(medicationId: string, date: string, slotIndex: number, minutes = SNOOZE_MINUTES) {
  await Notifications.scheduleNotificationAsync({
    identifier: `snooze:${medicationId}:${date}:${slotIndex}`,
    content: {
      title: 'Snoozed medicine reminder',
      body: 'Tap to see what to take.',
      categoryIdentifier: DOSE_CATEGORY,
      data: { medicationId, date, slotIndex },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60, channelId: DOSE_CHANNEL },
  });
}

/** Handles the Taken and Snooze buttons on a notification, without the app being opened. */
async function handleResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as { medicationId?: string; date?: string; slotIndex?: number; minute?: number };
  if (!data?.medicationId || !data.date) return;

  // Dose notifications carry the minute; recover the slot by matching against the schedule.
  const meds = await listMedications();
  const med = meds.find((m) => m.id === data.medicationId);
  if (!med) return;
  const people = await listPeople();
  const meals = people.find((p) => p.id === med.personId)?.mealTimes ?? (await getGlobalMealTimes());
  const dose = dosesForDay(med.schedule, data.date, meals).find((d) =>
    data.slotIndex != null ? d.slotIndex === data.slotIndex : d.minute === data.minute,
  );
  if (!dose) return;
  const ref = { medicationId: med.id, date: data.date, minute: dose.minute, slotIndex: dose.slotIndex, amount: dose.amount };

  if (response.actionIdentifier === 'taken') {
    await logDose(ref, 'taken');
  } else if (response.actionIdentifier === 'snooze') {
    await logDose(ref, 'snoozed', { snoozedUntilMinute: minuteOf(new Date()) + SNOOZE_MINUTES });
    await scheduleSnooze(med.id, data.date, dose.slotIndex);
  }
}

/** Starts the reminder engine: re-plans on start, on data changes (debounced), and on foreground. */
export function startReminderEngine(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => replanReminders().catch((e) => console.warn('Reminder re-plan failed', e)), 400);
  };

  schedule();
  const offData = onDataChange(schedule);
  const appSub = AppState.addEventListener('change', (s) => s === 'active' && schedule());
  const respSub = Notifications.addNotificationResponseReceivedListener((r) => {
    handleResponse(r).catch((e) => console.warn('Notification action failed', e));
  });

  return () => {
    if (timer) clearTimeout(timer);
    offData();
    appSub.remove();
    respSub.remove();
  };
}
