import { isFutureDate, isToday, startOfDay } from '../../src/utils/workout-window';

describe('workout-window extended', () => {
  it('detects future dates', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isFutureDate(tomorrow)).toBe(true);
  });

  it('detects today', () => {
    expect(isToday(new Date())).toBe(true);
  });

  it('normalizes start of day', () => {
    const d = startOfDay(new Date('2026-07-27T15:30:00'));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});
