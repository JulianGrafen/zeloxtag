import { automotiveMetaClassName } from "@/components/ui/automotive";
import { cn } from "@/lib/utils";

import type { OilChangeRecord } from "./oilChangeRecords";
import type { BrakeServiceRecord } from "./brakeServiceRecords";

type ServiceRecord = Pick<
  OilChangeRecord | BrakeServiceRecord,
  "kmBasedEstimate" | "kmPerDay" | "partNumber" | "nextDueDate"
>;

export function ServiceIntervalDueHint({ record }: { record: ServiceRecord }) {
  if (!record.kmBasedEstimate || record.kmPerDay == null) return null;
  return (
    <p className={cn("mt-2 normal-case", automotiveMetaClassName)}>
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
      <p className={automotiveMetaClassName}>Teilenummer (Beleg-OCR)</p>
      <p className="mt-0.5 font-mono text-[0.88rem] font-medium text-zinc-100">
        {partNumber}
      </p>
    </div>
  );
}
