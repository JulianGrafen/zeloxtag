const STORAGE_KEY = "zt_showcase_daily_stats_toast_v1";

type DailyStatsToastRecord = {
  v: 1;
  date: string;
};

export function berlinCalendarDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(date);
}

export function wasShowcaseDailyStatsToastShownToday(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as DailyStatsToastRecord;
    return parsed.v === 1 && parsed.date === berlinCalendarDateKey();
  } catch {
    return false;
  }
}

export function markShowcaseDailyStatsToastShownToday(): void {
  if (typeof window === "undefined") return;

  const record: DailyStatsToastRecord = {
    v: 1,
    date: berlinCalendarDateKey(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}
