import { emptyReadingDraft, flagReading, formatReading, parseReading } from '../readings';

describe('readings', () => {
  it('parses and formats blood pressure', () => {
    const { value } = parseReading('bp', { ...emptyReadingDraft(), sys: '132', dia: '84', pulse: '72' });
    expect(value).toEqual({ type: 'bp', sys: 132, dia: 84, pulse: 72 });
    expect(formatReading(value!)).toBe('132/84 mmHg · pulse 72');
    expect(parseReading('bp', { ...emptyReadingDraft(), sys: '80', dia: '120' }).error).toBeTruthy();
  });

  it('accepts a decimal comma and flags ranges', () => {
    const t = parseReading('temperature', { ...emptyReadingDraft(), value: '38,1' }).value!;
    expect(t).toEqual({ type: 'temperature', celsius: 38.1 });
    expect(flagReading(t)).toBe('high');
    expect(flagReading({ type: 'sugar', mgdl: 120, context: 'fasting' })).toBe('high');
    expect(flagReading({ type: 'sugar', mgdl: 120, context: 'post_meal' })).toBe('normal');
    expect(flagReading({ type: 'sugar', mgdl: 150, context: 'random' })).toBe('normal');
    expect(flagReading({ type: 'sugar', mgdl: 200, context: 'random' })).toBe('high');
    expect(flagReading({ type: 'sugar', mgdl: 65, context: 'random' })).toBe('low');
    expect(flagReading({ type: 'spo2', percent: 92 })).toBe('low');
  });

  it('rejects out-of-range values', () => {
    expect(parseReading('sugar', { ...emptyReadingDraft(), value: '5' }).error).toBeTruthy();
    expect(parseReading('spo2', { ...emptyReadingDraft(), value: '' }).error).toBeTruthy();
  });
});
