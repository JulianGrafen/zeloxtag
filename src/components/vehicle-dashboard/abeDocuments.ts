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
    partName: "Widebody Kotflügel Satz",
    manufacturer: "Rocket Bunny / TRA Kyoto",
    documentLabel: "ABE · PDF",
    issuedAt: "14.01.2025",
    status: "gültig",
    authority: "KBA / Hersteller",
    approvalNumber: "ABE KBA 44521",
    category: "Aerodynamik",
    summary:
      "Allgemeine Betriebserlaubnis für das Widebody-Kotflügelsatz am Toyota Supra A80. Montage gemäß Einbauanleitung, Sichtprüfung erforderlich.",
    vehicleFitment: ["Toyota Supra", "Toyota Supra A80"],
    conditions: [
      "Montage nur nach mitgelieferter Einbauanleitung",
      "Befestigungspunkte unverändert belassen",
      "Nach Einbau Sichtprüfung der Unterbodenfreiheit",
    ],
    fileName: "ABE_Widebody_Kotfluegel_Supra_A80.pdf",
    fileSize: "1,8 MB",
    pages: 3,
    scannedAt: "16.01.2025",
    compatibilityTable: {
      caption: "Verwendungsbereich",
      headers: ["Hersteller", "Modell", "Typ", "EG-BE", "Auflage"],
      rows: [
        {
          id: "row-mr2",
          cells: ["Toyota", "MR2", "W20", "e11*98/14*0112", "A1"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
        {
          id: "row-supra",
          cells: ["Toyota", "Supra", "A80", "e11*93/81*0016", "A1 / A2"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
        {
          id: "row-supra-rz",
          cells: ["Toyota", "Supra RZ", "A80", "e11*93/81*0016", "A1"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
        {
          id: "row-celica",
          cells: ["Toyota", "Celica", "T23", "e11*98/14*0148", "A3"],
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
    vehicleFitment: ['Toyota Supra A80 · 18"'],
    conditions: [
      "Nur freigegebene Rad-/Reifenkombination verwenden",
      "Anzugsmoment Radmuttern: 140 Nm",
      "Nach 50 km Nachziehen der Radmuttern",
    ],
    fileName: "ABE_RAYS_TE37_18_Supra.pdf",
    fileSize: "2,4 MB",
    pages: 4,
    scannedAt: "05.11.2024",
  },
  {
    id: "sport-federn",
    partName: "HKS Hipermax Fahrwerk",
    manufacturer: "HKS",
    documentLabel: "ABE · PDF",
    issuedAt: "22.08.2024",
    status: "gültig",
    authority: "TÜV / Hersteller",
    approvalNumber: "ABE HKS-A80-09",
    category: "Fahrwerk",
    summary:
      "Tieferlegung über HKS Hipermax. Freigabe für Supra A80, Achsvermessung nach Einbau empfohlen.",
    vehicleFitment: ["Toyota Supra A80"],
    conditions: [
      "Achsvermessung nach Einbau empfohlen",
      "Restfederweg beachten",
      "Keine Kombination mit anderen Tieferlegungsteilen ohne Freigabe",
    ],
    fileName: "ABE_HKS_Hipermax_Supra_A80.pdf",
    fileSize: "1,2 MB",
    pages: 2,
    scannedAt: "24.08.2024",
  },
  {
    id: "exhaust",
    partName: "HKS Hi-Power Abgasanlage",
    manufacturer: "HKS",
    documentLabel: "Teilegutachten · PDF",
    issuedAt: "09.06.2024",
    status: "gültig",
    authority: "TÜV Süd",
    approvalNumber: "TG 2024-0612",
    category: "Abgasanlage",
    summary:
      "Teilegutachten für HKS Hi-Power Cat-Back Abgasanlage. Eintragung erforderlich; Abgasverhalten gemäß Gutachten prüfen.",
    vehicleFitment: ["Toyota Supra A80"],
    conditions: [
      "Eintragung in die Fahrzeugpapiere erforderlich",
      "Abgasverhalten gemäß Gutachten prüfen",
      "Katalysator-Position unverändert belassen",
    ],
    fileName: "TG_HKS_HiPower_Exhaust_Supra.pdf",
    fileSize: "3,1 MB",
    pages: 5,
    scannedAt: "12.06.2024",
  },
  {
    id: "spoiler",
    partName: "GReddy GT Wing",
    manufacturer: "GReddy",
    documentLabel: "ABE · PDF",
    issuedAt: "18.03.2024",
    status: "gültig",
    authority: "KBA",
    approvalNumber: "ABE KBA 44102",
    category: "Aerodynamik",
    summary:
      "ABE für GReddy GT Wing am Supra A80. Befestigung nur auf freigegebenen Aufnahmepunkten, keine zusätzliche Bohrung am Heckdeckel.",
    vehicleFitment: ["Toyota Supra A80"],
    conditions: [
      "Nur auf freigegebenen Aufnahmepunkten montieren",
      "Keine zusätzlichen Bohrungen",
      "Klebe- und Schraubverbindung gemäß Anleitung",
    ],
    fileName: "ABE_GReddy_GT_Wing_Supra.pdf",
    fileSize: "0,9 MB",
    pages: 2,
    scannedAt: "20.03.2024",
  },
  {
    id: "intake",
    partName: "HKS Cold Air Intake",
    manufacturer: "HKS",
    documentLabel: "Teilegutachten · PDF",
    issuedAt: "02.12.2023",
    status: "gültig",
    authority: "TÜV Nord",
    approvalNumber: "TG 2023-1208",
    category: "Ansaugung",
    summary:
      "Teilegutachten HKS Cold-Air-Intake für den 2JZ-GTE. Geräuschmessung und Sichtprüfung bei Eintragung.",
    vehicleFitment: ["Toyota Supra", "Toyota Supra A80"],
    conditions: [
      "Geräuschmessung bei Eintragung",
      "Sichtprüfung der Luftführung",
      "Originalen Luftmassenmesser weiterverwenden",
    ],
    fileName: "TG_HKS_Intake_Supra_A80.pdf",
    fileSize: "2,0 MB",
    pages: 3,
    scannedAt: "04.12.2023",
  },
];

export function getAbeDocument(id: string): AbeDocument | undefined {
  return ABE_DOCUMENTS.find((doc) => doc.id === id);
}
