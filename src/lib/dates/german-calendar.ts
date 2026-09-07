/** German weekday labels (Monday-first). */
export const GERMAN_WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export const GERMAN_MONTH_LABELS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

export type CalendarDayCell = {
  iso: string;
  day: number;
  inMonth: boolean;
};

export function parseIsoDateParts(
  iso: string | null | undefined,
): { year: number; monthIndex: number; day: number } | null {
  if (!iso?.trim()) return null;
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(day) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const date = new Date(year, monthIndex, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, monthIndex, day };
}

export function toIsoDate(year: number, monthIndex: number, day: number): string {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayLabel = String(day).padStart(2, "0");
  return `${year}-${month}-${dayLabel}`;
}

export function localTodayIsoDate(date: Date = new Date()): string {
  return toIsoDate(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatGermanMonthYear(year: number, monthIndex: number): string {
  return `${GERMAN_MONTH_LABELS[monthIndex]} ${year}`;
}

export function addMonths(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; monthIndex: number } {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function buildMonthGrid(
  year: number,
  monthIndex: number,
): CalendarDayCell[] {
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarDayCell[] = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push({ iso: "", day: 0, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      iso: toIsoDate(year, monthIndex, day),
      day,
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ iso: "", day: 0, inMonth: false });
  }

  return cells;
}

export function compareIsoDates(a: string, b: string): number {
  return a.localeCompare(b);
}
