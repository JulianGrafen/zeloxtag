export type InvoiceCategory =
  | "Service"
  | "Tuning"
  | "Teile"
  | "Werkstatt"
  | "Inspektion";

export interface InvoiceLineItem {
  label: string;
  amount: number;
}

export interface InvoiceDocument {
  id: string;
  title: string;
  vendor: string;
  category: InvoiceCategory;
  issuedAt: string;
  amount: number;
  currency: string;
  status: "bezahlt" | "offen" | "erstattet";
  invoiceNumber: string;
  paymentMethod: string;
  mileageKm?: number;
  notes: string;
  lineItems: InvoiceLineItem[];
  fileName: string;
  fileSize: string;
  pages?: number;
  scannedAt: string;
}

function formatEur(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export { formatEur };

export const INVOICE_DOCUMENTS: InvoiceDocument[] = [
  {
    id: "service-oelwechsel",
    title: "Ölwechsel inkl. Filter",
    vendor: "Toyota Partner Stuttgart",
    category: "Service",
    issuedAt: "12.03.2026",
    amount: 461.9,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "RE-2026-0312",
    paymentMethod: "Kreditkarte",
    mileageKm: 87210,
    notes:
      "Toyota Genuine Motor Oil 5W-30 für 2JZ-GTE, Ölfilter und Dichtung erneuert.",
    lineItems: [
      { label: "Arbeitslohn Ölwechsel", amount: 95.0 },
      { label: "Motoröl 5W-30 (6,0 l)", amount: 214.5 },
      { label: "Ölfilter-Satz", amount: 48.9 },
      { label: "Entsorgungsgebühr", amount: 18.5 },
      { label: "MwSt. 19 %", amount: 85.0 },
    ],
    fileName: "Rechnung_Oelwechsel_Maerz2026.pdf",
    fileSize: "0,6 MB",
    scannedAt: "12.03.2026",
  },
  {
    id: "carbon-frontlippe-kauf",
    title: "GReddy GT-Flügel",
    vendor: "GReddy Europe · Frankfurt",
    category: "Teile",
    issuedAt: "08.01.2025",
    amount: 2380.0,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "GRD-88421",
    paymentMethod: "Überweisung",
    notes: "GReddy GT Wing Supra A80 inkl. Montage-Kit und ABE-Unterlagen.",
    lineItems: [
      { label: "GReddy GT Wing Supra A80", amount: 1890.0 },
      { label: "Montage-Kit", amount: 129.0 },
      { label: "Versand", amount: 49.0 },
      { label: "MwSt. 19 %", amount: 312.0 },
    ],
    fileName: "Rechnung_GReddy_GT_Wing.pdf",
    fileSize: "0,4 MB",
    scannedAt: "09.01.2025",
  },
  {
    id: "felgen-montage",
    title: "RAYS TE37 Montage",
    vendor: "Felgen & Fahrwerk Stuttgart",
    category: "Werkstatt",
    issuedAt: "04.11.2024",
    amount: 312.4,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "RM-241104",
    paymentMethod: "EC-Karte",
    mileageKm: 84180,
    notes: "Auswuchten, RDKS anlernen, Radmuttern mit 140 Nm angezogen.",
    lineItems: [
      { label: "Felgenmontage 4×", amount: 96.0 },
      { label: "Auswuchten", amount: 64.0 },
      { label: "RDKS anlernen", amount: 48.0 },
      { label: "Material / Ventile", amount: 34.4 },
      { label: "MwSt. 19 %", amount: 70.0 },
    ],
    fileName: "Rechnung_RAYS_Montage.pdf",
    fileSize: "0,5 MB",
    scannedAt: "04.11.2024",
  },
  {
    id: "fahrwerk-einbau",
    title: "HKS Fahrwerk Einbau",
    vendor: "2JZ Tuning Garage Heilbronn",
    category: "Tuning",
    issuedAt: "22.08.2024",
    amount: 749.0,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "2JZ-90812",
    paymentMethod: "Überweisung",
    mileageKm: 82840,
    notes: "HKS Hipermax Einbau VA/HA inkl. Achsvermessung nach Einbau.",
    lineItems: [
      { label: "Arbeitslohn Fahrwerk", amount: 380.0 },
      { label: "Achsvermessung", amount: 149.0 },
      { label: "Hilfsstoffe", amount: 35.0 },
      { label: "MwSt. 19 %", amount: 185.0 },
    ],
    fileName: "Rechnung_HKS_Fahrwerk_Einbau.pdf",
    fileSize: "0,7 MB",
    scannedAt: "23.08.2024",
  },
  {
    id: "bremsen-service",
    title: "Bremsen Service VA",
    vendor: "Toyota Autohaus Karlsruhe",
    category: "Inspektion",
    issuedAt: "15.05.2024",
    amount: 969.2,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "RE-2024-0515",
    paymentMethod: "Kreditkarte",
    mileageKm: 80120,
    notes:
      "Bremsscheiben und Beläge Vorderachse erneuert, Bremsflüssigkeit gewechselt.",
    lineItems: [
      { label: "Bremsscheiben VA (Satz)", amount: 429.0 },
      { label: "Bremsbeläge VA", amount: 188.0 },
      { label: "Bremsflüssigkeit DOT4", amount: 42.0 },
      { label: "Arbeitslohn", amount: 168.0 },
      { label: "MwSt. 19 %", amount: 142.2 },
    ],
    fileName: "Rechnung_Bremsen_VA.pdf",
    fileSize: "0,9 MB",
    scannedAt: "15.05.2024",
  },
  {
    id: "downpipe-kauf",
    title: "HKS Abgasanlage",
    vendor: "HKS Europe · Köln",
    category: "Teile",
    issuedAt: "02.06.2024",
    amount: 2646.0,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "HKS-66201",
    paymentMethod: "Kreditkarte",
    notes: "HKS Hi-Power Cat-Back inkl. Dichtringe und Teilegutachten-Unterlagen.",
    lineItems: [
      { label: "HKS Hi-Power Exhaust Supra", amount: 2190.0 },
      { label: "Montagematerial", amount: 69.0 },
      { label: "Versand versichert", amount: 49.0 },
      { label: "MwSt. 19 %", amount: 338.0 },
    ],
    fileName: "Rechnung_HKS_Exhaust.pdf",
    fileSize: "0,5 MB",
    scannedAt: "03.06.2024",
  },
];

export function getInvoiceDocument(id: string): InvoiceDocument | undefined {
  return INVOICE_DOCUMENTS.find((doc) => doc.id === id);
}

export function getInvoiceTotal(
  docs: InvoiceDocument[] = INVOICE_DOCUMENTS,
): number {
  return docs.reduce((sum, doc) => sum + doc.amount, 0);
}
