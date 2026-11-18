# Medication & Checkup Tracker — Product and Technical Spec (v2 draft)

_Draft 2026-11-18, revised the same day: Phase 1 is Personal only, and Caregiver moves to Phase 2 · for review by Subbu_

## 1. Goal

A phone app that reliably reminds you and your family to take medicines and go to checkups. It works fully offline, keeps data on the device, and needs no account.

## 2. People (Phase 1: Personal only)

- No mode choice in Phase 1. The app starts with a profile called "Me", and you can add family members (Amma, Appa, and others).
- **Person**: name, photo or colour, date of birth (optional), meal times (overrides the global ones), notes.
- Caregiver features are in Phase 2 (section 11). The data model already supports many people, so Caregiver can reuse the same core.

## 3. Doctors

- Each person has their own doctors: name, specialty, clinic, phone, address, notes.
- A doctor can be linked to several people, for example a family GP. In the data, a doctor is global and a person_doctor table links them.
- Medications and checkups link to a doctor (optional for over-the-counter medicines).

## 4. Medications

- Fields: name, strength (for example 500 mg), form (tablet, syrup, injection, and others), doctor, notes, and a photo of the strip (optional).
- **Dose schedule**, one or more slots per day:
  - **Meal-relative**: before, with, or after breakfast, lunch, or dinner, plus bedtime. The offset is configurable, for example 30 minutes before.
  - **Clock time**: a fixed time, as a fallback.
  - **Frequency**: daily, specific weekdays, every N days, or as needed (PRN, with no reminder).
- **Course**: start date and an optional end date ("for 10 days" or "until date").
- **Tapering**: a list of phases, each with a dose amount and a duration, for example 3 tabs for 5 days, then 2 for 5 days, then 1 for 5 days. The schedule follows the current phase automatically.
- **Copy and search**: one tap copies the medicine name to the clipboard and opens a browser search for it.

### Meal times
- Global defaults in Settings: breakfast 08:00, lunch 13:00, dinner 20:00, bedtime 22:30. A person can override them.
- If you change a meal time, every reminder that depends on it is rescheduled.

## 5. Stock (shared across people)

- **Stock item**: a medicine product (name and strength) with a quantity on hand, a unit, and a low-stock threshold.
- One stock item can supply several medications, even for different people. For example, Amma and Appa can share one box of the same BP tablet.
- Each dose marked Taken subtracts its amount from the linked stock.
- **Refill warning**: when the days of stock left (quantity ÷ combined daily use) falls to the threshold or below (default 5 days), the app sends a notification and shows a banner. "Add stock" records a purchase.

## 6. Today view and dose log

- A timeline of today's doses, grouped by meal slot. When there is more than one person, there is a per-person filter.
- Actions on each dose: **Taken** (the time can be edited), **Skip** (with an optional reason), and **Snooze** (10, 30, or 60 minutes).
- Actions on the notification itself: Taken and Snooze, without opening the app.
- Overdue doses are highlighted. A missed dose becomes "Missed" after a set window (default 3 hours).
- History: a calendar showing what was taken or missed per person, and an adherence %.

## 7. Health log

- **Side effects**: free text, severity (mild, moderate, severe), optional link to a medication, and a time.
- **Readings**: blood pressure (systolic/diastolic/pulse), blood sugar (fasting, post-meal, or random, in mg/dL), weight, temperature, SpO₂. The design allows more reading types later.
- A simple trend chart for each reading type. Readings can be exported as CSV or PDF to share with a doctor.

## 8. Checkups

- Fields: title (for example "HbA1c test" or "Cardiology follow-up"), person, doctor, location, notes.
- **Recurrence**:
  - Presets: every 1, 3, 6, or 12 months.
  - Custom: every N days, weeks, or months.
  - Specific dates: a list of dates.
- **Reminders**: by default 1 day before and on the morning of the checkup. Both are configurable.
- **Mark visited**: records the visit date and optional notes or attachments. The next checkup is then scheduled from the visit date. For specific dates, the next date in the list is used.

## 9. Reminders (critical path)

- Local notifications only (`expo-notifications`). No server is involved, so reminders work in airplane mode.
- **Rolling window scheduler**: iOS allows only 64 pending local notifications. So we schedule the next 48 hours, or as many as fit under the limit (iOS about 60, Android about 400), ordered soonest first. We re-plan:
  - when the app opens or returns to the foreground,
  - after any change to a medication, checkup, meal time, or person,
  - after each dose action,
  - from a background task (`expo-background-fetch` / `expo-task-manager`, best effort), and on Android after a reboot.
- Android: a high-importance channel for doses, exact alarms (`SCHEDULE_EXACT_ALARM`) with a request for the permission, and battery-optimisation guidance during onboarding.
- If the device's time zone changes, the plan is rebuilt in local wall-clock time.
- **Escalation**: if a dose is not acted on, a single re-alert after 15 minutes (configurable).

## 10. Privacy and security

- **Storage**: SQLite encrypted with SQLCipher (`op-sqlite` with SQLCipher enabled, or `expo-sqlite` with SQLCipher). The 256-bit key is random and stored in the Keychain or Keystore through `expo-secure-store`.
- **App lock**: a PIN (stored as an Argon2/scrypt hash) and/or biometrics (`expo-local-authentication`). The app re-locks after N minutes in the background.
- Notification text is generic by default ("Time for Amma's 8:00 medicines"), with an option to show medicine names. This keeps names off the lock screen.
- **Backup**: Export creates a `.medbak` file containing a JSON dump of every table, a gzip, then AES-256-GCM with a key derived from a backup passphrase you choose (scrypt or Argon2id). You save it with the share sheet (Drive, iCloud Files, WhatsApp to yourself, and so on). Restore reads the file, asks for the passphrase, and then either replaces everything or merges by UUID.
- No accounts, analytics, or network calls in v1. Browser search is the only network use, and it happens outside the app.

## 11. Caregiver (Phase 2)

For someone who looks after several seniors on behalf of their families. For example, a caregiver looks after Senior A for Person A, and Senior B for Persons B and C.

**Still open:** Caregiver could ship as a mode inside this app or as a second app built from the same codebase. The core (section 12) is kept free of mode-specific logic so both remain possible.

### 11a. Send update (first step, no server)
- Each senior gets **family contacts**: name, relationship, phone, and preferred channel (WhatsApp or SMS).
- **Send update** on a senior builds a plain-text summary for a chosen period (today by default):
  - doses taken, skipped, and missed, with adherence %,
  - latest readings (BP, sugar, and others) and any side effects,
  - next checkup,
  - a free-text note from the caregiver.
- The app opens WhatsApp (`wa.me` link or share sheet) or SMS, already addressed to that senior's contacts and with the summary filled in. The caregiver taps Send. Nothing leaves the phone without that tap.
- Optional daily reminder, for example at 8 PM: "Send today's updates", with a list of the seniors who haven't had one yet.
- A caregiver with many seniors gets a "Send all" queue that goes through each senior in turn.

### 11b. Family viewer (later, encrypted sync)
A read-only view of one senior's schedule and log on a family member's phone. It works without accounts.

1. **Pairing**: the caregiver opens Senior → Share, and the app shows a QR code for that one senior. It contains a random `shareId` and a 256-bit `shareKey`. The family member scans it. Nothing secret reaches a server.
2. **Data model**: every row has a UUID, `updated_at` (a hybrid logical clock), `deleted`, and `device_id`. Changes for that senior go into a local outbox.
3. **Transport**: events are encrypted with the shareKey (XChaCha20-Poly1305) and pushed to a tiny relay that stores opaque blobs: `POST/GET /share/{shareId}/events?since=…`. It can run as a Cloudflare Worker with KV or R2. The relay cannot read the data, and it has no user accounts.
4. **Merge**: last-writer-wins per field, using the HLC. Dose log entries are append-only, so they never conflict.
5. **Roles**: viewer by default, with editor possible later. The caregiver revokes access by rotating the key, which starts a new shareId.
6. **Alerts**: optional missed-dose push to family members, using Expo push tokens stored per shareId.

## 12. Technical architecture

- **Language**: English only in v1. UI strings live in one file so other languages can be added later.
- **Framework**: Expo (SDK 52 or later), React Native, TypeScript, and expo-router. It needs a development build, not Expo Go, because of SQLCipher and notification actions.
- **Layers**:
  - `src/db`: schema, migrations, and repositories (Drizzle ORM on top of op-sqlite).
  - `src/domain`: pure TypeScript logic with unit tests (Jest). It covers dose expansion (schedule, meals, tapering, then concrete times), checkup recurrence, stock forecasting, and notification planning.
  - `src/services`: the notification scheduler, the lock, and backup.
  - `src/state`: Zustand for UI state, with the database as the source of truth.
  - `app/`: expo-router screens.
- **Main tables**: person, doctor, person_doctor, meal_profile, medication, dose_schedule, taper_phase, stock_item, medication_stock, dose_event (planned, taken, skipped, snoozed, missed), checkup, checkup_visit, reading, side_effect, settings, notification_plan.
- **Shared core**: everything in `src/domain` and `src/db` has no knowledge of any mode. Caregiver can then be added as a feature module (`src/features/caregiver`), or as a second app in a monorepo that reuses the core as a package.
- **Testing**: Jest for the domain logic, with priority on schedule and recurrence edge cases (DST, month ends, Feb 29). Maestro for end-to-end testing of reminders on devices.

## 13. Screens (v1)

Onboarding (your profile, meal times, permissions, lock setup) · Today · People → Person (meds, checkups, doctors, log) · Add/Edit Medication (schedule builder with tapering) · Stock · Checkups list and detail · Health log and charts · Settings (meal times, lock, notifications, backup and restore).

## 14. Phasing

| Phase | Scope |
|---|---|
| **1 — Personal core** | Me and family, doctors, medications with meal timing and tapering, Today view with Taken, Skip, and Snooze, local reminders, shared stock with refill warnings, checkups with recurrence, readings and side effects, copy and search, encrypted DB, lock, backup and restore |
| **1.1** | Reading charts, doctor export (CSV or PDF), home-screen widget |
| **2a — Caregiver: send update** | Family contacts per senior, update summary through WhatsApp or SMS, daily send reminder |
| **2b — Caregiver: family viewer** | QR pairing per senior, end-to-end encrypted relay sync, missed-dose alerts |
| **Decide before 2a** | Caregiver as a mode or as a second app |
