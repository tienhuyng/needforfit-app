import { getLogWindowDeadline, isWithinLogWindow, shouldLockLog } from '../../src/utils/workout-window';

describe('workout-window', () => {
  it('allows logging on scheduled day', () => {
    const scheduled = new Date('2026-07-26T00:00:00');
    const within = new Date('2026-07-26T12:00:00');
    expect(isWithinLogWindow(scheduled, within)).toBe(true);
  });

  it('allows logging on the day after scheduled date', () => {
    const scheduled = new Date('2026-07-26T00:00:00');
    const nextDay = new Date('2026-07-27T12:00:00');
    expect(isWithinLogWindow(scheduled, nextDay)).toBe(true);
  });

  it('blocks logging after the extended deadline', () => {
    const scheduled = new Date('2026-07-26T00:00:00');
    const after = new Date('2026-07-28T00:00:01');
    expect(isWithinLogWindow(scheduled, after)).toBe(false);
    expect(shouldLockLog(scheduled, after)).toBe(true);
  });

  it('deadline is start of scheduled day + 48 hours', () => {
    const scheduled = new Date('2026-07-26T00:00:00');
    const start = new Date(scheduled);
    start.setHours(0, 0, 0, 0);
    const deadline = getLogWindowDeadline(scheduled);
    expect(deadline.getTime()).toBe(start.getTime() + 48 * 60 * 60 * 1000);
  });
});
