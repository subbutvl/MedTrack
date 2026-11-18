/**
 * SQL migrations, applied in order and tracked with PRAGMA user_version.
 * Every row has a UUID id plus updated_at and deleted, so Phase 2 encrypted sync can be
 * added without reshaping tables.
 */
const common = `id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted INTEGER NOT NULL DEFAULT 0`;

export const migrations: string[] = [
  `
  CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);

  CREATE TABLE person (
    ${common},
    name TEXT NOT NULL,
    is_self INTEGER NOT NULL DEFAULT 0,
    color TEXT,
    date_of_birth TEXT,
    meal_times TEXT,            -- JSON MealTimes, null = use global defaults
    notes TEXT
  );

  CREATE TABLE doctor (
    ${common},
    name TEXT NOT NULL,
    specialty TEXT,
    clinic TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT
  );

  CREATE TABLE person_doctor (
    person_id TEXT NOT NULL REFERENCES person(id),
    doctor_id TEXT NOT NULL REFERENCES doctor(id),
    PRIMARY KEY (person_id, doctor_id)
  );

  CREATE TABLE stock_item (
    ${common},
    name TEXT NOT NULL,
    strength TEXT,
    unit TEXT NOT NULL DEFAULT 'tablet',
    quantity REAL NOT NULL DEFAULT 0,
    threshold_days INTEGER NOT NULL DEFAULT 5
  );

  CREATE TABLE medication (
    ${common},
    person_id TEXT NOT NULL REFERENCES person(id),
    doctor_id TEXT REFERENCES doctor(id),
    stock_item_id TEXT REFERENCES stock_item(id),   -- shared stock across people
    name TEXT NOT NULL,
    strength TEXT,
    form TEXT,
    schedule TEXT NOT NULL,     -- JSON MedicationSchedule (slots, frequency, course, taper)
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE dose_event (
    ${common},
    medication_id TEXT NOT NULL REFERENCES medication(id),
    planned_date TEXT NOT NULL,
    planned_minute INTEGER NOT NULL,
    slot_index INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('taken','skipped','snoozed','missed')),
    amount REAL,
    acted_at INTEGER,
    reason TEXT
  );
  CREATE INDEX idx_dose_event_day ON dose_event(planned_date);

  CREATE TABLE checkup (
    ${common},
    person_id TEXT NOT NULL REFERENCES person(id),
    doctor_id TEXT REFERENCES doctor(id),
    title TEXT NOT NULL,
    location TEXT,
    recurrence TEXT NOT NULL,   -- JSON CheckupRecurrence
    next_date TEXT,
    notes TEXT
  );

  CREATE TABLE checkup_visit (
    ${common},
    checkup_id TEXT NOT NULL REFERENCES checkup(id),
    visit_date TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE reading (
    ${common},
    person_id TEXT NOT NULL REFERENCES person(id),
    type TEXT NOT NULL,         -- bp | sugar | weight | temperature | spo2
    value TEXT NOT NULL,        -- JSON, for example {"sys":120,"dia":80,"pulse":72}
    context TEXT,               -- for example fasting or post_meal
    taken_at INTEGER NOT NULL
  );

  CREATE TABLE side_effect (
    ${common},
    person_id TEXT NOT NULL REFERENCES person(id),
    medication_id TEXT REFERENCES medication(id),
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('mild','moderate','severe')),
    noted_at INTEGER NOT NULL
  );
  `,
];
