import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedNotification } from '@/domain/notificationPlan';

export const DOSE_CHANNEL = 'doses';
export const DOSE_CATEGORY = 'dose';

/** Runs once at startup: shows alerts in the foreground and registers the Taken and Snooze actions. */
export async function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DOSE_CHANNEL, {
      name: 'Medicine reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }

  await Notifications.setNotificationCategoryAsync(DOSE_CATEGORY, [
    { identifier: 'taken', buttonTitle: 'Taken', options: { opensAppToForeground: false } },
    { identifier: 'snooze', buttonTitle: 'Snooze 10 min', options: { opensAppToForeground: false } },
  ]);
}

export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/**
 * Replaces every scheduled dose reminder with the given plan, which comes from
 * planDoseNotifications. Notification text stays generic so medicine names stay off the lock screen.
 */
export async function applyDosePlan(plan: PlannedNotification[], titleFor: (personId: string) => string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('dose:'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  for (const p of plan) {
    const [y, m, d] = p.date.split('-').map(Number);
    const when = new Date(y, m - 1, d, Math.floor(p.minute / 60), p.minute % 60);
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: {
        title: titleFor(p.personId),
        body: 'Tap to see what to take.',
        categoryIdentifier: DOSE_CATEGORY,
        data: { medicationId: p.medicationId, date: p.date, minute: p.minute, slotIndex: p.slotIndex },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: DOSE_CHANNEL },
    });
  }
}

/** Replaces scheduled checkup reminders. The text names the person and checkup but no medicine. */
export async function applyCheckupPlan(
  plan: { id: string; date: string; minute: number; kind: 'dayBefore' | 'morningOf'; checkupId: string }[],
  describe: (checkupId: string) => { title: string; who: string } | undefined,
) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith('checkup:')).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  for (const p of plan) {
    const info = describe(p.checkupId);
    if (!info) continue;
    const [y, m, d] = p.date.split('-').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: {
        title: p.kind === 'dayBefore' ? `Checkup tomorrow: ${info.title}` : `Checkup today: ${info.title}`,
        body: info.who,
        data: { checkupId: p.checkupId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(y, m - 1, d, Math.floor(p.minute / 60), p.minute % 60),
        channelId: DOSE_CHANNEL,
      },
    });
  }
}
