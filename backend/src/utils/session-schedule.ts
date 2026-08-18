/** Returns true when the session has a calendar date assigned. */
export function hasScheduledDate(date: Date | null | undefined): date is Date {
  return date != null;
}
