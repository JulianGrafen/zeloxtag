export interface OilChangeRecord {
  id: string;
  date: string;
  mileageKm: number;
  workshop: string;
  oilSpec: string;
  oilAmountLiters: number;
  filterChanged: boolean;
  intervalKm: number;
  intervalMonths: number;
  nextDueKm: number;
  nextDueDate: string;
  notes: string;
  invoiceRef?: string;
  status: "aktuell" | "erledigt";
}

export const OIL_CHANGE_RECORDS: OilChangeRecord[] = [
  {
    id: "oel-2026-03",
    date: "12.03.2026",
    mileageKm: 67210,
    workshop: "Mazda Zentrum Stuttgart",
    oilSpec: "Mazda Original Oil Ultra 5W-30",
    oilAmountLiters: 5.0,
    filterChanged: true,
    intervalKm: 10000,
    intervalMonths: 12,
    nextDueKm: 77210,
    nextDueDate: "12.03.2027",
    notes: "Letzter Ölwechsel. Filter und Dichtung erneuert, Ölstand geprüft.",
    invoiceRef: "service-oelwechsel",
    status: "aktuell",
  },
  {
    id: "oel-2025-04",
    date: "18.04.2025",
    mileageKm: 57140,
    workshop: "Mazda Partner Fellbach",
    oilSpec: "Mazda Original Oil Ultra 5W-30",
    oilAmountLiters: 5.0,
    filterChanged: true,
    intervalKm: 10000,
    intervalMonths: 12,
    nextDueKm: 67140,
    nextDueDate: "18.04.2026",
    notes: "Regelmäßiger Service inkl. Sichtprüfung Unterboden.",
    status: "erledigt",
  },
  {
    id: "oel-2024-05",
    date: "22.05.2024",
    mileageKm: 46880,
    workshop: "Rotary Werkstatt Heilbronn",
    oilSpec: "Idemitsu Rotary Premix 5W-30",
    oilAmountLiters: 5.0,
    filterChanged: true,
    intervalKm: 10000,
    intervalMonths: 12,
    nextDueKm: 56880,
    nextDueDate: "22.05.2025",
    notes: "Ölwechsel nach Trackday, leichter Verbrauch dokumentiert.",
    status: "erledigt",
  },
  {
    id: "oel-2023-06",
    date: "09.06.2023",
    mileageKm: 36220,
    workshop: "Mazda Autohaus Karlsruhe",
    oilSpec: "Mazda Original Oil Ultra 5W-30",
    oilAmountLiters: 5.0,
    filterChanged: true,
    intervalKm: 10000,
    intervalMonths: 12,
    nextDueKm: 46220,
    nextDueDate: "09.06.2024",
    notes: "Inspektion + Ölwechsel, Originalfilter verwendet.",
    status: "erledigt",
  },
  {
    id: "oel-2022-07",
    date: "14.07.2022",
    mileageKm: 25110,
    workshop: "Mazda Partner Ludwigsburg",
    oilSpec: "Mazda Original Oil Ultra 5W-30",
    oilAmountLiters: 5.0,
    filterChanged: true,
    intervalKm: 10000,
    intervalMonths: 12,
    nextDueKm: 35110,
    nextDueDate: "14.07.2023",
    notes: "Erster Intervall-Ölwechsel nach Übernahme.",
    status: "erledigt",
  },
];

export function getOilChangeRecord(id: string): OilChangeRecord | undefined {
  return OIL_CHANGE_RECORDS.find((record) => record.id === id);
}

export function getLatestOilChange(
  records: OilChangeRecord[] = OIL_CHANGE_RECORDS,
): OilChangeRecord | undefined {
  return records.find((record) => record.status === "aktuell") ?? records[0];
}
