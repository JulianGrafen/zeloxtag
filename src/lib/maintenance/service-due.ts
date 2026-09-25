import { estimateDueDateFromKm } from "@/lib/vehicles/mileage-velocity";

function addMonthsIso(isoDate: string, months: number): string | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function mergeServiceDueDates(input: {
  lastServiceIsoDate: string;
  intervalMonths: number;
  lastMileageKm: number;
  nextDueKm: number;
  latestKnownMileageKm: number | null;
  kmPerDay: number | null;
}): { nextDueDateIso: string; kmBasedEstimate: boolean } {
  const calendarDue =
    addMonthsIso(input.lastServiceIsoDate, input.intervalMonths) ??
    input.lastServiceIsoDate;

  if (
    input.kmPerDay == null ||
    input.kmPerDay <= 0 ||
    input.latestKnownMileageKm == null
  ) {
    return { nextDueDateIso: calendarDue, kmBasedEstimate: false };
  }

  const kmDue = estimateDueDateFromKm({
    referenceIsoDate: input.lastServiceIsoDate,
    referenceMileageKm: input.lastMileageKm,
    targetMileageKm: input.nextDueKm,
    kmPerDay: input.kmPerDay,
  });

  if (!kmDue) {
    return { nextDueDateIso: calendarDue, kmBasedEstimate: false };
  }

  const chosen = kmDue < calendarDue ? kmDue : calendarDue;
  return {
    nextDueDateIso: chosen,
    kmBasedEstimate: kmDue < calendarDue,
  };
}

export function toDisplayDate(isoDate: string | null): string {
  if (!isoDate) return "Ohne Datum";
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [year, month, day] = isoDate.split("-");
    return `${day}.${month}.${year}`;
  }
  return isoDate;
}
