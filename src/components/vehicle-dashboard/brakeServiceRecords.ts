export interface BrakeServiceRecord {
  id: string;
  date: string;
  mileageKm: number;
  workshop: string | null;
  intervalKm: number;
  intervalMonths: number;
  nextDueKm: number;
  nextDueDate: string;
  nextDueDateIso: string;
  kmBasedEstimate: boolean;
  kmPerDay: number | null;
  partNumber: string | null;
  notes: string;
  invoiceRef?: string;
  status: "aktuell" | "erledigt";
  isManual?: boolean;
}

export function getLatestBrakeService(
  records: BrakeServiceRecord[],
): BrakeServiceRecord | null {
  return records.find((record) => record.status === "aktuell") ?? records[0] ?? null;
}
