/** A workout placed on a day at a time of day. */
export interface Plan {
  id: string;
  workoutId: string;
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  /** Minutes after midnight, 0-1439. */
  minutes: number;
}

/** Hours shown on a day's timeline (5 am to 11 pm). */
export const DAY_START_HOUR = 5;
export const DAY_END_HOUR = 23;
/** Height of one hour row on the timeline (a multiple of 4). */
export const HOUR_H = 72;
/** Time steps when editing a plan. */
export const TIME_STEP = 15;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local "YYYY-MM-DD" for a Date. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local Date at midnight for a "YYYY-MM-DD" key. */
export function fromKey(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

/** The next `count` days starting today, as keys. */
export function upcomingDays(today: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => dateKey(addDays(today, i)));
}

/** "07:30" (24 h, the way a timetable reads). */
export function formatTime(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Keep a time on the 15-minute grid and inside the day. */
export function snapTime(minutes: number): number {
  const snapped = Math.round(minutes / TIME_STEP) * TIME_STEP;
  return Math.min(1440 - TIME_STEP, Math.max(0, snapped));
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Chip label: "Today", "Tmrw", else the short weekday. */
export function dayChip(key: string, today: Date): { top: string; day: number } {
  const d = fromKey(key);
  const t = dateKey(today);
  const top = key === t ? 'Today' : key === dateKey(addDays(today, 1)) ? 'Tmrw' : (WEEKDAYS[d.getDay()] ?? '');
  return { top, day: d.getDate() };
}

/** Heading for a day: "Today", "Tomorrow" or "Monday", with "30 Nov" beside it. */
export function dayTitle(key: string, today: Date): { title: string; date: string } {
  const d = fromKey(key);
  const title = key === dateKey(today) ? 'Today' : key === dateKey(addDays(today, 1)) ? 'Tomorrow' : (WEEKDAYS_LONG[d.getDay()] ?? '');
  return { title, date: `${d.getDate()} ${MONTHS[d.getMonth()]}` };
}

/** Plans for one day, earliest first. */
export function plansOn(plans: Plan[], key: string): Plan[] {
  return plans.filter((p) => p.date === key).sort((a, b) => a.minutes - b.minutes);
}

/** Vertical position of a time on the timeline. */
export function timeToY(minutes: number): number {
  return ((minutes - DAY_START_HOUR * 60) / 60) * HOUR_H;
}
