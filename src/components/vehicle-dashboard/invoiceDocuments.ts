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
    vendor: "Toyota Zentrum Stuttgart",
    category: "Service",
    issuedAt: "12.03.2026",
    amount: 458.3,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "RE-2026-0312",
    paymentMethod: "Kreditkarte",
    mileageKm: 42180,
    notes:
      "Toyota Genuine Motor Oil 0W-20 für B58, Ölfilter und Dichtung erneuert.",
    lineItems: [
      { label: "Arbeitslohn Ölwechsel", amount: 89.0 },
      { label: "Motoröl 0W-20 (6,5 l)", amount: 218.5 },
      { label: "Ölfilter-Satz", amount: 48.9 },
      { label: "Entsorgungsgebühr", amount: 18.5 },
      { label: "MwSt. 19 %", amount: 82.4 },
    ],
    fileName: "Rechnung_Oelwechsel_Maerz2026.pdf",
    fileSize: "0,6 MB",
    scannedAt: "12.03.2026",
  },
  {
    id: "carbon-frontlippe-kauf",
    title: "Carbon Frontlippe",
    vendor: "Verus Europe · München",
    category: "Teile",
    issuedAt: "08.01.2025",
    amount: 1415.2,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "VER-88421",
    paymentMethod: "Überweisung",
    notes: "Verus Carbon Frontlippe inkl. Montage-Kit und ABE-Unterlagen.",
    lineItems: [
      { label: "Carbon Frontlippe GR Supra", amount: 1149.0 },
      { label: "Montage-Kit", amount: 89.0 },
      { label: "Versand", amount: 29.0 },
      { label: "MwSt. 19 %", amount: 148.2 },
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
    mileageKm: 39840,
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
    title: "KW V3 Coilover Einbau",
    vendor: "Supra Tuning Garage Heilbronn",
    category: "Tuning",
    issuedAt: "22.08.2024",
    amount: 642.8,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "STG-90812",
    paymentMethod: "Überweisung",
    mileageKm: 37210,
    notes: "Coilover-Einbau VA/HA inkl. Achsvermessung nach Einbau.",
    lineItems: [
      { label: "Arbeitslohn Federwechsel", amount: 320.0 },
      { label: "Achsvermessung", amount: 129.0 },
      { label: "Hilfsstoffe", amount: 25.0 },
      { label: "MwSt. 19 %", amount: 168.8 },
    ],
    fileName: "Rechnung_KW_Einbau.pdf",
    fileSize: "0,7 MB",
    scannedAt: "23.08.2024",
  },
  {
    id: "bremsen-service",
    title: "Bremsen Service VA",
    vendor: "Toyota Autohaus Karlsruhe",
    category: "Inspektion",
    issuedAt: "15.05.2024",
    amount: 986.2,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "RE-2024-0515",
    paymentMethod: "Kreditkarte",
    mileageKm: 35120,
    notes:
      "Bremsscheiben und Beläge Vorderachse erneuert, Bremsflüssigkeit gewechselt.",
    lineItems: [
      { label: "Bremsscheiben VA (Satz)", amount: 489.0 },
      { label: "Bremsbeläge VA", amount: 198.0 },
      { label: "Bremsflüssigkeit DOT4", amount: 42.0 },
      { label: "Arbeitslohn", amount: 148.0 },
      { label: "MwSt. 19 %", amount: 149.2 },
    ],
    fileName: "Rechnung_Bremsen_VA.pdf",
    fileSize: "0,9 MB",
    scannedAt: "15.05.2024",
  },
  {
    id: "downpipe-kauf",
    title: "Akrapovič Abgasanlage",
    vendor: "Akrapovič Europe · Köln",
    category: "Teile",
    issuedAt: "02.06.2024",
    amount: 3396.2,
    currency: "EUR",
    status: "bezahlt",
    invoiceNumber: "AKR-66201",
    paymentMethod: "Kreditkarte",
    notes: "Slip-On Abgasanlage inkl. Dichtringe und Teilegutachten-Unterlagen.",
    lineItems: [
      { label: "Akrapovič Slip-On GR Supra", amount: 2890.0 },
      { label: "Montagematerial", amount: 49.0 },
      { label: "Versand versichert", amount: 39.0 },
      { label: "MwSt. 19 %", amount: 418.2 },
    ],
    fileName: "Rechnung_Akrapovic_Exhaust.pdf",
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
