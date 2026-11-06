import {Task} from './task';

/* How often a screen showing `ageLabel` re-reads the clock: its finest step is a minute. */
export const AGE_REFRESH_MS = 30_000;

/** The task's title as the screens print it, never blank. */
export const taskTitle = (task: Task): string => task.title || 'Untitled task';

/** "just now", "12 min ago", "3 h ago", "2 d ago". */
export const ageLabel = (since: number, now: number): string => {
  const minutes = Math.max(0, Math.floor((now - since) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
};

/** "45 min", "2 h 15 min". */
export const durationLabel = (minutes: number): string => {
  const whole = Math.max(0, Math.round(minutes));
  if (whole < 60) return `${whole} min`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};
