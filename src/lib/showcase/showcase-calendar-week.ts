const BERLIN = "Europe/Berlin";

function berlinDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BERLIN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
  };
}

function berlinWeekdayMon1Sun7(date: Date): number {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: BERLIN,
    weekday: "short",
  }).format(date);

  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[weekday] ?? 1;
}

function addBerlinDays(
  year: number,
  month: number,
  day: number,
  deltaDays: number,
): string {
  const utcNoon = Date.UTC(year, month - 1, day + deltaDays, 12, 0, 0);
  const shifted = berlinDateParts(new Date(utcNoon));
  return `${shifted.year}-${String(shifted.month).padStart(2, "0")}-${String(shifted.day).padStart(2, "0")}`;
}

/** Monday-start week bucket (Europe/Berlin), e.g. `2026-04-07`. */
export function showcaseCalendarWeekKey(date = new Date()): string {
  const parts = berlinDateParts(date);
  const weekday = berlinWeekdayMon1Sun7(date);
  return addBerlinDays(parts.year, parts.month, parts.day, -(weekday - 1));
}

/** Week key for the calendar week that ended on the most recent Sunday (Berlin). */
export function previousShowcaseCalendarWeekKey(date = new Date()): string {
  const currentMonday = showcaseCalendarWeekKey(date);
  const [year, month, day] = currentMonday.split("-").map(Number);
  return addBerlinDays(year, month, day, -7);
}
