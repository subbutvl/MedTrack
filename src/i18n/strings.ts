/**
 * Every piece of user-facing text lives here. v1 is English only. Adding a language later
 * means adding a sibling object with the same shape and choosing it by locale.
 */
export const strings = {
  appName: 'MedTrack',
  tabs: { today: 'Today', people: 'People', checkups: 'Checkups', settings: 'Settings' },
  today: {
    title: 'Today',
    emptyTitle: 'No doses scheduled',
    emptyBody: 'Add a medicine for yourself or a family member, and today’s doses will show up here.',
    taken: 'Taken',
    skip: 'Skip',
    snooze: 'Snooze',
  },
  people: {
    title: 'People',
    me: 'Me',
    emptyTitle: 'Just you for now',
    emptyBody: 'Add family members like Amma or Appa to track their medicines and checkups too.',
    add: 'Add family member',
  },
  checkups: {
    title: 'Checkups',
    emptyTitle: 'No checkups yet',
    emptyBody: 'Add recurring checkups such as every 3 months, or specific dates. The next one is scheduled after each visit.',
  },
  medication: {
    lookUp: 'Look up',
    copyAndSearch: (name: string) => `Copy ${name} and search the web`,
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    mealTimes: 'Meal times',
    security: 'App lock',
    backup: 'Backup & restore',
  },
  meals: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', bedtime: 'Bedtime' },
} as const;
