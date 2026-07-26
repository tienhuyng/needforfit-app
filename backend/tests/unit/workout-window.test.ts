import { getLogWindowDeadline, isWithinLogWindow, shouldLockLog } from '../../src/utils/workout-window';

describe('workout-window', () => {
  it('allows logging within 24h of scheduled date', () => {
    const scheduled = new Date('2026-07-26T00:00:00');
    const within = new Date('2026-07-26T12:00:00');
    expect(isWithinLogWindow(scheduled, within)).toBe(true);
  });

  it('blocks logging after 24h deadline', () => {
    const scheduled = new Date('2026-07-26T00:00:00');
    const after = new Date('2026-07-27T00:00:01');
    expect(isWithinLogWindow(scheduled, after)).toBe(false);
    expect(shouldLockLog(scheduled, after)).toBe(true);
  });

  it('deadline is scheduled date + 24 hours', () => {
    const scheduled = new Date('2026-07-26T00:00:00');
    const deadline = getLogWindowDeadline(scheduled);
    expect(deadline.getTime()).toBe(scheduled.getTime() + 24 * 60 * 60 * 1000);
  });
});
