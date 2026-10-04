import type { OilChangeRecord } from "./oilChangeRecords";
import type { BrakeServiceRecord } from "./brakeServiceRecords";

type ServiceRecord = Pick<
  OilChangeRecord | BrakeServiceRecord,
  "kmBasedEstimate" | "kmPerDay" | "partNumber" | "nextDueDate"
>;

export function ServiceIntervalDueHint({ record }: { record: ServiceRecord }) {
  if (!record.kmBasedEstimate || record.kmPerDay == null) return null;
  return (
    <p className="mt-2 text-[0.78rem] leading-snug text-[color:var(--vd-muted)] dark:text-zinc-400">
      Fälligkeitsdatum ca. {record.nextDueDate} — basierend auf Ø{" "}
      {record.kmPerDay.toLocaleString("de-DE", {
        maximumFractionDigits: 1,
      })}{" "}
      km/Tag aus deinen Belegen.
    </p>
  );
}

export function ServiceIntervalPartNumber({
  partNumber,
}: {
  partNumber: string | null | undefined;
}) {
  if (!partNumber?.trim()) return null;
  return (
    <div className="zt-card mt-3 rounded-xl p-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)] dark:text-zinc-500">
        Teilenummer (Beleg-OCR)
      </p>
      <p className="mt-0.5 font-mono text-[0.88rem] font-medium text-zinc-100">
        {partNumber}
      </p>
    </div>
  );
}
