# MedTrack

A local-first medicine and checkup tracker for you and your family, built with React Native and Expo.

- **Reminders work offline.** They use local notifications on a rolling schedule that stays under the iOS limit of 64 pending notifications.
- **Doses are timed around meals.** You can set before, with, or after breakfast, lunch, or dinner, and also courses, tapering, and Taken, Skip, or Snooze.
- **Medicine stock can be shared across people.** Refill warnings use the days of stock left.
- **Checkups can repeat.** Choose 1, 3, 6, or 12 months, a custom interval, or specific dates. The next one is scheduled automatically after each visit.
- **Data stays on the phone.** It is kept in encrypted SQLite (SQLCipher) behind a PIN or biometric lock. There are no accounts.

The full product and technical spec is in [`docs/spec.md`](docs/spec.md).

## Stack

- Expo SDK 58, React Native 0.88, TypeScript, Expo Router (routes are in `src/app/`)
- Fonts: **Outfit** for headings and **Geist** for body text, through `@expo-google-fonts`
- Theme: light and dark mode, built from the Soft Medical Professional Blue palette (`src/theme/palette.ts`). The app follows the system setting by default, and you can override it in Settings.
- Safe areas: every screen renders inside `<Screen>` (`src/components/Screen.tsx`), which uses `react-native-safe-area-context`. This keeps content clear of notches, camera cutouts, and the home indicator.
- Storage: `expo-sqlite` with `useSQLCipher`, and the key stored in `expo-secure-store`

## Getting started

```bash
npm install
npx expo run:android   # or run:ios. A development build is needed (SQLCipher, notification actions)
```

Expo Go is not supported because the app uses native modules that Expo Go doesn't include. For cloud builds, use `npx eas-cli@latest build --profile development`.

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Runs the Jest unit tests for the domain logic (schedules, tapering, checkups, stock, notification plan) |
| `npm run typecheck` | Runs `tsc --noEmit` |
| `npm start` | Starts the Metro dev server |

## Layout

```
src/
  app/            Expo Router screens (tabs: Today, People, Checkups, Settings)
  components/     Screen (safe area), AppText, Card, Button, EmptyState, CopySearchButton
  theme/          palette, light/dark tokens, typography, ThemeProvider
  domain/         pure TypeScript logic with tests, independent of any app mode
  db/             encrypted SQLite client and migrations
  services/       notification setup and scheduling
  i18n/           all user-facing strings (English only in v1)
```
