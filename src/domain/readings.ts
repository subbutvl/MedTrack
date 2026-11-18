/** Health readings: types, validation, display and simple range flags. */
export type ReadingType = 'bp' | 'sugar' | 'weight' | 'temperature' | 'spo2';
export type SugarContext = 'fasting' | 'post_meal' | 'random';

export type ReadingValue =
  | { type: 'bp'; sys: number; dia: number; pulse?: number }
  | { type: 'sugar'; mgdl: number; context: SugarContext }
  | { type: 'weight'; kg: number }
  | { type: 'temperature'; celsius: number }
  | { type: 'spo2'; percent: number };

export type Flag = 'low' | 'normal' | 'high';

export const READING_TYPES: ReadingType[] = ['bp', 'sugar', 'weight', 'temperature', 'spo2'];

export type ReadingDraft = { sys: string; dia: string; pulse: string; value: string; context: SugarContext };
export const emptyReadingDraft = (): ReadingDraft => ({ sys: '', dia: '', pulse: '', value: '', context: 'fasting' });

const num = (t: string) => {
  const n = Number(t.replace(',', '.'));
  return t.trim() && Number.isFinite(n) ? n : null;
};

/** Validates input using broad, physically plausible bounds. It catches typos without judging health. */
export function parseReading(type: ReadingType, d: ReadingDraft): { value?: ReadingValue; error?: string } {
  switch (type) {
    case 'bp': {
      const sys = num(d.sys);
      const dia = num(d.dia);
      const pulse = d.pulse.trim() ? num(d.pulse) : undefined;
      if (sys == null || dia == null || sys < 50 || sys > 260 || dia < 30 || dia > 160 || dia >= sys)
        return { error: 'Enter systolic and diastolic, for example 120 and 80.' };
      if (pulse === null || (pulse !== undefined && (pulse < 30 || pulse > 220))) return { error: 'Pulse should be between 30 and 220.' };
      return { value: { type, sys, dia, ...(pulse !== undefined ? { pulse } : {}) } };
    }
    case 'sugar': {
      const mgdl = num(d.value);
      if (mgdl == null || mgdl < 20 || mgdl > 700) return { error: 'Enter blood sugar in mg/dL, for example 110.' };
      return { value: { type, mgdl, context: d.context } };
    }
    case 'weight': {
      const kg = num(d.value);
      if (kg == null || kg < 1 || kg > 350) return { error: 'Enter weight in kg.' };
      return { value: { type, kg } };
    }
    case 'temperature': {
      const celsius = num(d.value);
      if (celsius == null || celsius < 30 || celsius > 45) return { error: 'Enter temperature in °C, for example 37.2.' };
      return { value: { type, celsius } };
    }
    case 'spo2': {
      const percent = num(d.value);
      if (percent == null || percent < 50 || percent > 100) return { error: 'Enter SpO₂ between 50 and 100.' };
      return { value: { type, percent } };
    }
  }
}

export function formatReading(v: ReadingValue): string {
  switch (v.type) {
    case 'bp':
      return `${v.sys}/${v.dia} mmHg${v.pulse ? ` · pulse ${v.pulse}` : ''}`;
    case 'sugar':
      return `${v.mgdl} mg/dL · ${v.context === 'fasting' ? 'fasting' : v.context === 'post_meal' ? 'after meal' : 'random'}`;
    case 'weight':
      return `${v.kg} kg`;
    case 'temperature':
      return `${v.celsius} °C`;
    case 'spo2':
      return `${v.percent}%`;
  }
}

/** The main number used for trend bars. */
export function primaryValue(v: ReadingValue): number {
  switch (v.type) {
    case 'bp':
      return v.sys;
    case 'sugar':
      return v.mgdl;
    case 'weight':
      return v.kg;
    case 'temperature':
      return v.celsius;
    case 'spo2':
      return v.percent;
  }
}

/**
 * Common reference ranges, used only for colouring a reading. They are not medical advice,
 * and a person's doctor may set different targets.
 */
export function flagReading(v: ReadingValue): Flag {
  switch (v.type) {
    case 'bp':
      if (v.sys >= 140 || v.dia >= 90) return 'high';
      if (v.sys < 90 || v.dia < 60) return 'low';
      return 'normal';
    case 'sugar': {
      if (v.mgdl < 70) return 'low';
      const high = v.context === 'fasting' ? 100 : 140;
      return v.mgdl > high ? 'high' : 'normal';
    }
    case 'temperature':
      return v.celsius >= 37.8 ? 'high' : v.celsius < 35.5 ? 'low' : 'normal';
    case 'spo2':
      return v.percent < 94 ? 'low' : 'normal';
    case 'weight':
      return 'normal';
  }
}
