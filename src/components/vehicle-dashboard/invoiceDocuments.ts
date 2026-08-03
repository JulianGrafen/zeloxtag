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
    vendor: "Mazda Zentrum Stuttgart",
    category: "Service",
    issuedAt: "12.03.2026",
    amount: 428.9,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "RE-2026-0312",
    paymentMethod: "Kreditkarte",
    mileageKm: 67210,
    notes:
      "Mazda Originalöl 5W-30 für Renesis, Ölfilter und Dichtung erneuert.",
    lineItems: [
      { label: "Arbeitslohn Ölwechsel", amount: 89.0 },
      { label: "Motoröl 5W-30 (5,0 l)", amount: 198.5 },
      { label: "Ölfilter-Satz", amount: 42.9 },
      { label: "Entsorgungsgebühr", amount: 18.5 },
      { label: "MwSt. 19 %", amount: 80.0 },
    ],
    fileName: "Rechnung_Oelwechsel_Maerz2026.pdf",
    fileSize: "0,6 MB",
    scannedAt: "12.03.2026",
  },
  {
    id: "carbon-frontlippe-kauf",
    title: "Carbon Frontlippe",
    vendor: "AutoExe Europe · Frankfurt",
    category: "Teile",
    issuedAt: "08.01.2025",
    amount: 1299.0,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "AXE-88421",
    paymentMethod: "Überweisung",
    notes: "AutoExe Carbon Frontlippe inkl. Montage-Kit und ABE-Unterlagen.",
    lineItems: [
      { label: "Carbon Frontlippe RX-8", amount: 1049.0 },
      { label: "Montage-Kit", amount: 79.0 },
      { label: "Versand", amount: 29.0 },
      { label: "MwSt. 19 %", amount: 142.0 },
    ],
    fileName: "Rechnung_Carbon_Frontlippe.pdf",
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
    mileageKm: 64180,
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
    title: "Tein Sportfedern Einbau",
    vendor: "Rotary Tuning Garage Heilbronn",
    category: "Tuning",
    issuedAt: "22.08.2024",
    amount: 589.0,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "RTG-90812",
    paymentMethod: "Überweisung",
    mileageKm: 62840,
    notes: "Federwechsel VA/HA inkl. Achsvermessung nach Einbau.",
    lineItems: [
      { label: "Arbeitslohn Federwechsel", amount: 280.0 },
      { label: "Achsvermessung", amount: 129.0 },
      { label: "Hilfsstoffe", amount: 25.0 },
      { label: "MwSt. 19 %", amount: 155.0 },
    ],
    fileName: "Rechnung_Tein_Einbau.pdf",
    fileSize: "0,7 MB",
    scannedAt: "23.08.2024",
  },
  {
    id: "bremsen-service",
    title: "Bremsen Service VA",
    vendor: "Mazda Autohaus Karlsruhe",
    category: "Inspektion",
    issuedAt: "15.05.2024",
    amount: 876.2,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "RE-2024-0515",
    paymentMethod: "Kreditkarte",
    mileageKm: 60120,
    notes:
      "Bremsscheiben und Beläge Vorderachse erneuert, Bremsflüssigkeit gewechselt.",
    lineItems: [
      { label: "Bremsscheiben VA (Satz)", amount: 389.0 },
      { label: "Bremsbeläge VA", amount: 168.0 },
      { label: "Bremsflüssigkeit DOT4", amount: 42.0 },
      { label: "Arbeitslohn", amount: 148.0 },
      { label: "MwSt. 19 %", amount: 129.2 },
    ],
    fileName: "Rechnung_Bremsen_VA.pdf",
    fileSize: "0,9 MB",
    scannedAt: "15.05.2024",
  },
  {
    id: "downpipe-kauf",
    title: "Racing Beat Abgasanlage",
    vendor: "Racing Beat Europe · Köln",
    category: "Teile",
    issuedAt: "02.06.2024",
    amount: 2149.0,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "RB-66201",
    paymentMethod: "Kreditkarte",
    notes: "Cat-Back Abgasanlage inkl. Dichtringe und Teilegutachten-Unterlagen.",
    lineItems: [
      { label: "Racing Beat Exhaust RX-8", amount: 1790.0 },
      { label: "Montagematerial", amount: 49.0 },
      { label: "Versand versichert", amount: 39.0 },
      { label: "MwSt. 19 %", amount: 271.0 },
    ],
    fileName: "Rechnung_RacingBeat_Exhaust.pdf",
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
