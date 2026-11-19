import * as Crypto from 'expo-crypto';

import { nextCheckupDate } from '@/domain/checkups';
import type { ReadingType, ReadingValue } from '@/domain/readings';
import { DEFAULT_MEAL_TIMES, type CheckupRecurrence, type ISODate, type MealTimes, type MedicationSchedule, type MinuteOfDay } from '@/domain/types';
import type { LoggedEvent } from '@/domain/timeline';
import { getDb } from './client';
import { notifyChange } from './events';

const now = () => Date.now();
const uuid = () => Crypto.randomUUID();

// ---------- Settings ----------

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  );
  notifyChange();
}

export const getGlobalMealTimes = () => getSetting<MealTimes>('mealTimes', DEFAULT_MEAL_TIMES);
export const setGlobalMealTimes = (m: MealTimes) => setSetting('mealTimes', m);

// ---------- People ----------

export type Person = {
  id: string;
  name: string;
  isSelf: boolean;
  color: string | null;
  dateOfBirth: string | null;
  mealTimes: MealTimes | null;
  notes: string | null;
};

type PersonRow = {
  id: string;
  name: string;
  is_self: number;
  color: string | null;
  date_of_birth: string | null;
  meal_times: string | null;
  notes: string | null;
};

const toPerson = (r: PersonRow): Person => ({
  id: r.id,
  name: r.name,
  isSelf: r.is_self === 1,
  color: r.color,
  dateOfBirth: r.date_of_birth,
  mealTimes: r.meal_times ? (JSON.parse(r.meal_times) as MealTimes) : null,
  notes: r.notes,
});

export async function listPeople(): Promise<Person[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PersonRow>('SELECT * FROM person WHERE deleted = 0 ORDER BY is_self DESC, name COLLATE NOCASE');
  return rows.map(toPerson);
}

export async function getPerson(id: string): Promise<Person | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PersonRow>('SELECT * FROM person WHERE id = ? AND deleted = 0', id);
  return row ? toPerson(row) : null;
}

export type PersonInput = Pick<Person, 'name' | 'color' | 'dateOfBirth' | 'mealTimes' | 'notes'>;

export async function savePerson(input: PersonInput, id?: string): Promise<string> {
  const db = await getDb();
  const meals = input.mealTimes ? JSON.stringify(input.mealTimes) : null;
  if (id) {
    await db.runAsync(
      'UPDATE person SET name = ?, color = ?, date_of_birth = ?, meal_times = ?, notes = ?, updated_at = ? WHERE id = ?',
      input.name, input.color, input.dateOfBirth, meals, input.notes, now(), id,
    );
  } else {
    id = uuid();
    await db.runAsync(
      'INSERT INTO person (id, name, color, date_of_birth, meal_times, notes) VALUES (?, ?, ?, ?, ?, ?)',
      id, input.name, input.color, input.dateOfBirth, meals, input.notes,
    );
  }
  notifyChange();
  return id;
}

/** Soft-deletes a family member and their medicines. "Me" cannot be removed. */
export async function deletePerson(id: string) {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('UPDATE person SET deleted = 1, updated_at = ? WHERE id = ? AND is_self = 0', now(), id);
    await tx.runAsync('UPDATE medication SET deleted = 1, updated_at = ? WHERE person_id = ?', now(), id);
  });
  notifyChange();
}

// ---------- Stock ----------

export type StockItem = {
  id: string;
  name: string;
  strength: string | null;
  unit: string;
  quantity: number;
  thresholdDays: number;
};

type StockRow = { id: string; name: string; strength: string | null; unit: string; quantity: number; threshold_days: number };
const toStock = (r: StockRow): StockItem => ({
  id: r.id, name: r.name, strength: r.strength, unit: r.unit, quantity: r.quantity, thresholdDays: r.threshold_days,
});

export async function listStock(): Promise<StockItem[]> {
  const db = await getDb();
  return (await db.getAllAsync<StockRow>('SELECT * FROM stock_item WHERE deleted = 0 ORDER BY name COLLATE NOCASE')).map(toStock);
}

export async function createStock(input: Omit<StockItem, 'id'>): Promise<string> {
  const db = await getDb();
  const id = uuid();
  await db.runAsync(
    'INSERT INTO stock_item (id, name, strength, unit, quantity, threshold_days) VALUES (?, ?, ?, ?, ?, ?)',
    id, input.name, input.strength, input.unit, input.quantity, input.thresholdDays,
  );
  notifyChange();
  return id;
}

export async function addStock(id: string, amount: number) {
  const db = await getDb();
  await db.runAsync('UPDATE stock_item SET quantity = quantity + ?, updated_at = ? WHERE id = ?', amount, now(), id);
  notifyChange();
}

// ---------- Medications ----------

export type Medication = {
  id: string;
  personId: string;
  doctorId: string | null;
  stockItemId: string | null;
  name: string;
  strength: string | null;
  form: string | null;
  schedule: MedicationSchedule;
  notes: string | null;
  active: boolean;
};

type MedRow = {
  id: string;
  person_id: string;
  doctor_id: string | null;
  stock_item_id: string | null;
  name: string;
  strength: string | null;
  form: string | null;
  schedule: string;
  notes: string | null;
  active: number;
};

const toMed = (r: MedRow): Medication => ({
  id: r.id,
  personId: r.person_id,
  doctorId: r.doctor_id,
  stockItemId: r.stock_item_id,
  name: r.name,
  strength: r.strength,
  form: r.form,
  schedule: JSON.parse(r.schedule) as MedicationSchedule,
  notes: r.notes,
  active: r.active === 1,
});

export async function listMedications(personId?: string): Promise<Medication[]> {
  const db = await getDb();
  const rows = personId
    ? await db.getAllAsync<MedRow>('SELECT * FROM medication WHERE deleted = 0 AND person_id = ? ORDER BY name COLLATE NOCASE', personId)
    : await db.getAllAsync<MedRow>('SELECT * FROM medication WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
  return rows.map(toMed);
}

export async function getMedication(id: string): Promise<Medication | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<MedRow>('SELECT * FROM medication WHERE id = ? AND deleted = 0', id);
  return row ? toMed(row) : null;
}

export type MedicationInput = Omit<Medication, 'id' | 'active'>;

export async function saveMedication(input: MedicationInput, id?: string): Promise<string> {
  const db = await getDb();
  const schedule = JSON.stringify(input.schedule);
  if (id) {
    await db.runAsync(
      `UPDATE medication SET person_id = ?, doctor_id = ?, stock_item_id = ?, name = ?, strength = ?, form = ?,
       schedule = ?, notes = ?, updated_at = ? WHERE id = ?`,
      input.personId, input.doctorId, input.stockItemId, input.name, input.strength, input.form, schedule, input.notes, now(), id,
    );
  } else {
    id = uuid();
    await db.runAsync(
      `INSERT INTO medication (id, person_id, doctor_id, stock_item_id, name, strength, form, schedule, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, input.personId, input.doctorId, input.stockItemId, input.name, input.strength, input.form, schedule, input.notes,
    );
  }
  notifyChange();
  return id;
}

export async function deleteMedication(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE medication SET deleted = 1, updated_at = ? WHERE id = ?', now(), id);
  notifyChange();
}

// ---------- Dose log ----------

type EventRow = {
  medication_id: string;
  planned_date: string;
  slot_index: number;
  status: LoggedEvent['status'];
  snoozed_until: number | null;
};

export async function listDoseEvents(date: ISODate): Promise<LoggedEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EventRow>(
    'SELECT medication_id, planned_date, slot_index, status, snoozed_until FROM dose_event WHERE planned_date = ? AND deleted = 0',
    date,
  );
  return rows.map((r) => ({
    medicationId: r.medication_id,
    plannedDate: r.planned_date,
    slotIndex: r.slot_index,
    status: r.status,
    snoozedUntilMinute: r.snoozed_until,
  }));
}

/** Logged doses for every day from `from` to `to`, inclusive, for the calendar views. */
export async function listDoseEventsBetween(from: ISODate, to: ISODate): Promise<LoggedEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EventRow>(
    'SELECT medication_id, planned_date, slot_index, status, snoozed_until FROM dose_event WHERE planned_date BETWEEN ? AND ? AND deleted = 0',
    from,
    to,
  );
  return rows.map((r) => ({
    medicationId: r.medication_id,
    plannedDate: r.planned_date,
    slotIndex: r.slot_index,
    status: r.status,
    snoozedUntilMinute: r.snoozed_until,
  }));
}

export type DoseRef = { medicationId: string; date: ISODate; minute: MinuteOfDay; slotIndex: number; amount: number };

/**
 * Records Taken, Skip, or Snooze for one dose slot. Taken subtracts the amount from the linked
 * stock, and changing a Taken dose to something else puts it back, so stock stays correct when a
 * dose is corrected.
 */
export async function logDose(
  ref: DoseRef,
  status: 'taken' | 'skipped' | 'snoozed',
  opts: { snoozedUntilMinute?: MinuteOfDay; reason?: string } = {},
) {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const prev = await tx.getFirstAsync<{ status: string; amount: number | null }>(
      'SELECT status, amount FROM dose_event WHERE medication_id = ? AND planned_date = ? AND slot_index = ?',
      ref.medicationId, ref.date, ref.slotIndex,
    );
    const med = await tx.getFirstAsync<{ stock_item_id: string | null }>('SELECT stock_item_id FROM medication WHERE id = ?', ref.medicationId);

    await tx.runAsync(
      `INSERT INTO dose_event (id, medication_id, planned_date, planned_minute, slot_index, status, amount, acted_at, reason, snoozed_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(medication_id, planned_date, slot_index) DO UPDATE SET
         status = excluded.status, amount = excluded.amount, acted_at = excluded.acted_at,
         reason = excluded.reason, snoozed_until = excluded.snoozed_until, updated_at = excluded.acted_at, deleted = 0`,
      uuid(), ref.medicationId, ref.date, ref.minute, ref.slotIndex, status, ref.amount, now(),
      opts.reason ?? null, opts.snoozedUntilMinute ?? null,
    );

    if (med?.stock_item_id) {
      const wasTaken = prev?.status === 'taken';
      const delta = (wasTaken ? prev?.amount ?? ref.amount : 0) - (status === 'taken' ? ref.amount : 0);
      if (delta !== 0) {
        await tx.runAsync('UPDATE stock_item SET quantity = MAX(0, quantity + ?), updated_at = ? WHERE id = ?', delta, now(), med.stock_item_id);
      }
    }
  });
  notifyChange();
}

/** Undoes a logged dose and puts back any stock it used. */
export async function clearDose(ref: DoseRef) {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const prev = await tx.getFirstAsync<{ status: string; amount: number | null }>(
      'SELECT status, amount FROM dose_event WHERE medication_id = ? AND planned_date = ? AND slot_index = ? AND deleted = 0',
      ref.medicationId, ref.date, ref.slotIndex,
    );
    if (!prev) return;
    await tx.runAsync(
      'UPDATE dose_event SET deleted = 1, updated_at = ? WHERE medication_id = ? AND planned_date = ? AND slot_index = ?',
      now(), ref.medicationId, ref.date, ref.slotIndex,
    );
    if (prev.status === 'taken') {
      const med = await tx.getFirstAsync<{ stock_item_id: string | null }>('SELECT stock_item_id FROM medication WHERE id = ?', ref.medicationId);
      if (med?.stock_item_id) {
        await tx.runAsync('UPDATE stock_item SET quantity = quantity + ?, updated_at = ? WHERE id = ?', prev.amount ?? ref.amount, now(), med.stock_item_id);
      }
    }
  });
  notifyChange();
}

// ---------- Doctors ----------

export type Doctor = {
  id: string;
  name: string;
  specialty: string | null;
  clinic: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

export type DoctorInput = Omit<Doctor, 'id'>;

export async function listDoctors(personId?: string): Promise<Doctor[]> {
  const db = await getDb();
  return personId
    ? db.getAllAsync<Doctor>(
        `SELECT d.id, d.name, d.specialty, d.clinic, d.phone, d.address, d.notes FROM doctor d
         JOIN person_doctor pd ON pd.doctor_id = d.id WHERE pd.person_id = ? AND d.deleted = 0 ORDER BY d.name COLLATE NOCASE`,
        personId,
      )
    : db.getAllAsync<Doctor>(
        'SELECT id, name, specialty, clinic, phone, address, notes FROM doctor WHERE deleted = 0 ORDER BY name COLLATE NOCASE',
      );
}

export async function getDoctor(id: string): Promise<Doctor | null> {
  const db = await getDb();
  return db.getFirstAsync<Doctor>('SELECT id, name, specialty, clinic, phone, address, notes FROM doctor WHERE id = ? AND deleted = 0', id);
}

/** Saves a doctor and links them to a person. A doctor can be shared by several people, such as a family GP. */
export async function saveDoctor(input: DoctorInput, opts: { id?: string; personId?: string } = {}): Promise<string> {
  const db = await getDb();
  let id = opts.id;
  if (id) {
    await db.runAsync(
      'UPDATE doctor SET name = ?, specialty = ?, clinic = ?, phone = ?, address = ?, notes = ?, updated_at = ? WHERE id = ?',
      input.name, input.specialty, input.clinic, input.phone, input.address, input.notes, now(), id,
    );
  } else {
    id = uuid();
    await db.runAsync(
      'INSERT INTO doctor (id, name, specialty, clinic, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, input.name, input.specialty, input.clinic, input.phone, input.address, input.notes,
    );
  }
  if (opts.personId) await linkDoctor(opts.personId, id, false);
  notifyChange();
  return id;
}

export async function linkDoctor(personId: string, doctorId: string, notify = true) {
  const db = await getDb();
  await db.runAsync('INSERT OR IGNORE INTO person_doctor (person_id, doctor_id) VALUES (?, ?)', personId, doctorId);
  if (notify) notifyChange();
}

export async function unlinkDoctor(personId: string, doctorId: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM person_doctor WHERE person_id = ? AND doctor_id = ?', personId, doctorId);
  notifyChange();
}

// ---------- Checkups ----------

export type Checkup = {
  id: string;
  personId: string;
  doctorId: string | null;
  title: string;
  location: string | null;
  recurrence: CheckupRecurrence;
  nextDate: ISODate | null;
  notes: string | null;
};

type CheckupRow = {
  id: string;
  person_id: string;
  doctor_id: string | null;
  title: string;
  location: string | null;
  recurrence: string;
  next_date: string | null;
  notes: string | null;
};

const toCheckup = (r: CheckupRow): Checkup => ({
  id: r.id,
  personId: r.person_id,
  doctorId: r.doctor_id,
  title: r.title,
  location: r.location,
  recurrence: JSON.parse(r.recurrence) as CheckupRecurrence,
  nextDate: r.next_date,
  notes: r.notes,
});

export async function listCheckups(personId?: string): Promise<Checkup[]> {
  const db = await getDb();
  const order = "ORDER BY next_date IS NULL, next_date, title COLLATE NOCASE";
  const rows = personId
    ? await db.getAllAsync<CheckupRow>(`SELECT * FROM checkup WHERE deleted = 0 AND person_id = ? ${order}`, personId)
    : await db.getAllAsync<CheckupRow>(`SELECT * FROM checkup WHERE deleted = 0 ${order}`);
  return rows.map(toCheckup);
}

export async function getCheckup(id: string): Promise<Checkup | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CheckupRow>('SELECT * FROM checkup WHERE id = ? AND deleted = 0', id);
  return row ? toCheckup(row) : null;
}

export type CheckupInput = Omit<Checkup, 'id'>;

export async function saveCheckup(input: CheckupInput, id?: string): Promise<string> {
  const db = await getDb();
  const rec = JSON.stringify(input.recurrence);
  if (id) {
    await db.runAsync(
      'UPDATE checkup SET person_id = ?, doctor_id = ?, title = ?, location = ?, recurrence = ?, next_date = ?, notes = ?, updated_at = ? WHERE id = ?',
      input.personId, input.doctorId, input.title, input.location, rec, input.nextDate, input.notes, now(), id,
    );
  } else {
    id = uuid();
    await db.runAsync(
      'INSERT INTO checkup (id, person_id, doctor_id, title, location, recurrence, next_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id, input.personId, input.doctorId, input.title, input.location, rec, input.nextDate, input.notes,
    );
  }
  notifyChange();
  return id;
}

export async function deleteCheckup(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE checkup SET deleted = 1, updated_at = ? WHERE id = ?', now(), id);
  notifyChange();
}

export type CheckupVisit = { id: string; visitDate: ISODate; notes: string | null };

export async function listVisits(checkupId: string): Promise<CheckupVisit[]> {
  const db = await getDb();
  return db.getAllAsync<CheckupVisit>(
    'SELECT id, visit_date AS visitDate, notes FROM checkup_visit WHERE checkup_id = ? AND deleted = 0 ORDER BY visit_date DESC',
    checkupId,
  );
}

/** Every recorded visit to one person's checkups, for the calendar view. */
export async function listVisitsForPerson(personId: string): Promise<{ checkupId: string; visitDate: ISODate }[]> {
  const db = await getDb();
  return db.getAllAsync<{ checkupId: string; visitDate: ISODate }>(
    `SELECT v.checkup_id AS checkupId, v.visit_date AS visitDate FROM checkup_visit v
     JOIN checkup c ON c.id = v.checkup_id
     WHERE c.person_id = ? AND c.deleted = 0 AND v.deleted = 0`,
    personId,
  );
}

/** Records a visit and schedules the next checkup from the actual visit date. */
export async function markVisited(checkupId: string, visitDate: ISODate, notes: string | null = null): Promise<ISODate | undefined> {
  const db = await getDb();
  const c = await getCheckup(checkupId);
  if (!c) return undefined;
  const next = nextCheckupDate(c.recurrence, visitDate);
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('INSERT INTO checkup_visit (id, checkup_id, visit_date, notes) VALUES (?, ?, ?, ?)', uuid(), checkupId, visitDate, notes);
    await tx.runAsync('UPDATE checkup SET next_date = ?, updated_at = ? WHERE id = ?', next ?? null, now(), checkupId);
  });
  notifyChange();
  return next;
}

// ---------- Health log ----------

export type Reading = { id: string; personId: string; value: ReadingValue; takenAt: number };

export async function addReading(personId: string, value: ReadingValue, takenAt = now()) {
  const db = await getDb();
  const context = value.type === 'sugar' ? value.context : null;
  await db.runAsync(
    'INSERT INTO reading (id, person_id, type, value, context, taken_at) VALUES (?, ?, ?, ?, ?, ?)',
    uuid(), personId, value.type, JSON.stringify(value), context, takenAt,
  );
  notifyChange();
}

export async function listReadings(personId: string, type?: ReadingType, limit = 100): Promise<Reading[]> {
  const db = await getDb();
  const rows = type
    ? await db.getAllAsync<{ id: string; person_id: string; value: string; taken_at: number }>(
        'SELECT id, person_id, value, taken_at FROM reading WHERE person_id = ? AND type = ? AND deleted = 0 ORDER BY taken_at DESC LIMIT ?',
        personId, type, limit,
      )
    : await db.getAllAsync<{ id: string; person_id: string; value: string; taken_at: number }>(
        'SELECT id, person_id, value, taken_at FROM reading WHERE person_id = ? AND deleted = 0 ORDER BY taken_at DESC LIMIT ?',
        personId, limit,
      );
  return rows.map((r) => ({ id: r.id, personId: r.person_id, value: JSON.parse(r.value) as ReadingValue, takenAt: r.taken_at }));
}

export async function deleteReading(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE reading SET deleted = 1, updated_at = ? WHERE id = ?', now(), id);
  notifyChange();
}

export type Severity = 'mild' | 'moderate' | 'severe';
export type SideEffect = { id: string; personId: string; medicationId: string | null; description: string; severity: Severity; notedAt: number };

export async function addSideEffect(input: Omit<SideEffect, 'id' | 'notedAt'>, notedAt = now()) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO side_effect (id, person_id, medication_id, description, severity, noted_at) VALUES (?, ?, ?, ?, ?, ?)',
    uuid(), input.personId, input.medicationId, input.description, input.severity, notedAt,
  );
  notifyChange();
}

export async function listSideEffects(personId: string, limit = 50): Promise<SideEffect[]> {
  const db = await getDb();
  return db.getAllAsync<SideEffect>(
    `SELECT id, person_id AS personId, medication_id AS medicationId, description, severity, noted_at AS notedAt
     FROM side_effect WHERE person_id = ? AND deleted = 0 ORDER BY noted_at DESC LIMIT ?`,
    personId, limit,
  );
}

export async function deleteSideEffect(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE side_effect SET deleted = 1, updated_at = ? WHERE id = ?', now(), id);
  notifyChange();
}
