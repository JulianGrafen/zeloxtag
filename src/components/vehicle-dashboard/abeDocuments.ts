import type { TableData } from "@/lib/validations/abeSchema";

export interface AbeDocument {
  id: string;
  partName: string;
  manufacturer: string;
  documentLabel: string;
  issuedAt: string;
  status: "gültig" | "Prüfung" | "archiviert";
  authority: string;
  approvalNumber: string;
  summary: string;
  category: string;
  vehicleFitment: string[];
  conditions: string[];
  fileName: string;
  fileSize: string;
  pages: number;
  scannedAt: string;
  /** Optional Verwendungsbereich table for row highlighting demos. */
  compatibilityTable?: TableData;
}

export const ABE_DOCUMENTS: AbeDocument[] = [
  {
    id: "carbon-frontlippe",
    partName: "Carbon Frontlippe",
    manufacturer: "Verus Engineering",
    documentLabel: "ABE · PDF",
    issuedAt: "14.01.2025",
    status: "gültig",
    authority: "KBA / Hersteller",
    approvalNumber: "ABE KBA 12345",
    category: "Aerodynamik",
    summary:
      "Allgemeine Betriebserlaubnis für die Verus Engineering Carbon-Frontlippe am Toyota GR Supra. Montage gemäß Einbauanleitung, Sichtprüfung erforderlich.",
    vehicleFitment: ["Toyota GR Supra", "Toyota GR Supra A90"],
    conditions: [
      "Montage nur nach mitgelieferter Einbauanleitung",
      "Befestigungspunkte unverändert belassen",
      "Nach Einbau Sichtprüfung der Unterbodenfreiheit",
    ],
    fileName: "ABE_Carbon_Frontlippe_Supra.pdf",
    fileSize: "1,8 MB",
    pages: 3,
    scannedAt: "16.01.2025",
    compatibilityTable: {
      caption: "Verwendungsbereich",
      headers: ["Hersteller", "Modell", "Typ", "EG-BE", "Auflage"],
      rows: [
        {
          id: "row-z4",
          cells: ["BMW", "Z4", "G29", "e1*2007/46*0354", "A1"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
        {
          id: "row-supra",
          cells: ["Toyota", "GR Supra", "A90", "e11*2007/46*0354", "A1 / A2"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
        {
          id: "row-supra-jp",
          cells: ["Toyota", "GR Supra", "J29", "e11*2007/46*0354", "A1"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
        {
          id: "row-bmw-m2",
          cells: ["BMW", "M2", "G87", "e1*2007/46*0412", "A3"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
      ],
    },
  },
  {
    id: "rays-felgen",
    partName: "RAYS Volk TE37",
    manufacturer: "RAYS Engineering",
    documentLabel: "ABE · PDF",
    issuedAt: "03.11.2024",
    status: "gültig",
    authority: "KBA",
    approvalNumber: "ABE KBA 77821",
    category: "Räder",
    summary:
      "ABE für RAYS Volk TE37 Leichtmetallfelgen inkl. Rad-/Reifenkombination. Auflage: vorgeschriebene Radmuttern und Anzugsmomente einhalten.",
    vehicleFitment: ['Toyota GR Supra · 19"'],
    conditions: [
      "Nur freigegebene Rad-/Reifenkombination verwenden",
      "Anzugsmoment Radmuttern: 140 Nm",
      "Nach 50 km Nachziehen der Radmuttern",
    ],
    fileName: "ABE_RAYS_TE37_19.pdf",
    fileSize: "2,4 MB",
    pages: 4,
    scannedAt: "05.11.2024",
  },
  {
    id: "sport-federn",
    partName: "KW V3 Coilover",
    manufacturer: "KW",
    documentLabel: "ABE · PDF",
    issuedAt: "22.08.2024",
    status: "gültig",
    authority: "TÜV / Hersteller",
    approvalNumber: "ABE KW-SUPRA-A90",
    category: "Fahrwerk",
    summary:
      "Tieferlegung über KW V3 Coilover. Freigabe für GR Supra A90, Achsvermessung nach Einbau empfohlen.",
    vehicleFitment: ["Toyota GR Supra"],
    conditions: [
      "Achsvermessung nach Einbau empfohlen",
      "Restfederweg beachten",
      "Keine Kombination mit anderen Tieferlegungsteilen ohne Freigabe",
    ],
    fileName: "ABE_KW_V3_Supra.pdf",
    fileSize: "1,2 MB",
    pages: 2,
    scannedAt: "24.08.2024",
  },
  {
    id: "exhaust",
    partName: "Akrapovič Slip-On",
    manufacturer: "Akrapovič",
    documentLabel: "Teilegutachten · PDF",
    issuedAt: "09.06.2024",
    status: "gültig",
    authority: "TÜV Süd",
    approvalNumber: "TG 2024-0612",
    category: "Abgasanlage",
    summary:
      "Teilegutachten für Akrapovič Slip-On Abgasanlage. Eintragung erforderlich; Abgasverhalten gemäß Gutachten prüfen.",
    vehicleFitment: ["Toyota GR Supra A90"],
    conditions: [
      "Eintragung in die Fahrzeugpapiere erforderlich",
      "Abgasverhalten gemäß Gutachten prüfen",
      "Katalysator-Position unverändert belassen",
    ],
    fileName: "TG_Akrapovic_Exhaust_Supra.pdf",
    fileSize: "3,1 MB",
    pages: 5,
    scannedAt: "12.06.2024",
  },
  {
    id: "spoiler",
    partName: "Carbon Heckspoiler",
    manufacturer: "ADRO",
    documentLabel: "ABE · PDF",
    issuedAt: "18.03.2024",
    status: "gültig",
    authority: "KBA",
    approvalNumber: "ABE KBA 44102",
    category: "Aerodynamik",
    summary:
      "ABE für ADRO Carbon-Heckspoiler. Befestigung nur auf originalem Kofferraumdeckel, keine zusätzliche Bohrung.",
    vehicleFitment: ["Toyota GR Supra"],
    conditions: [
      "Nur auf originalem Kofferraumdeckel montieren",
      "Keine zusätzlichen Bohrungen",
      "Klebe- und Schraubverbindung gemäß Anleitung",
    ],
    fileName: "ABE_ADRO_Heckspoiler.pdf",
    fileSize: "0,9 MB",
    pages: 2,
    scannedAt: "20.03.2024",
  },
  {
    id: "intake",
    partName: "Eventuri Intake",
    manufacturer: "Eventuri",
    documentLabel: "Teilegutachten · PDF",
    issuedAt: "02.12.2023",
    status: "gültig",
    authority: "TÜV Nord",
    approvalNumber: "TG 2023-1208",
    category: "Ansaugung",
    summary:
      "Teilegutachten Eventuri Carbon-Intake für den B58. Geräuschmessung und Sichtprüfung bei Eintragung.",
    vehicleFitment: ["Toyota GR Supra", "Toyota GR Supra A90"],
    conditions: [
      "Geräuschmessung bei Eintragung",
      "Sichtprüfung der Luftführung",
      "Originalen Luftmassenmesser weiterverwenden",
    ],
    fileName: "TG_Eventuri_Intake_Supra.pdf",
    fileSize: "2,0 MB",
    pages: 3,
    scannedAt: "04.12.2023",
  },
];

export function getAbeDocument(id: string): AbeDocument | undefined {
  return ABE_DOCUMENTS.find((doc) => doc.id === id);
}
