/** Log window: from start of scheduled_date until scheduled_date + 24 hours. */
export function getLogWindowDeadline(scheduledDate: Date): Date {
  const start = new Date(scheduledDate);
  start.setHours(0, 0, 0, 0);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function isWithinLogWindow(scheduledDate: Date, now = new Date()): boolean {
  const start = new Date(scheduledDate);
  start.setHours(0, 0, 0, 0);
  const deadline = getLogWindowDeadline(scheduledDate);
  return now >= start && now <= deadline;
}

export function shouldLockLog(scheduledDate: Date, now = new Date()): boolean {
  return now > getLogWindowDeadline(scheduledDate);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isFutureDate(date: Date, now = new Date()): boolean {
  return startOfDay(date) > startOfDay(now);
}

export function isToday(date: Date, now = new Date()): boolean {
  return startOfDay(date).getTime() === startOfDay(now).getTime();
}
