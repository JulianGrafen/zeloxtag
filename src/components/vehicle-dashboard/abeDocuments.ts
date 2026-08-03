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
}

export const ABE_DOCUMENTS: AbeDocument[] = [
  {
    id: "carbon-frontlippe",
    partName: "Carbon Frontlippe",
    manufacturer: "AutoExe",
    documentLabel: "ABE · PDF",
    issuedAt: "14.01.2025",
    status: "gültig",
    authority: "KBA / Hersteller",
    approvalNumber: "ABE KBA 12345",
    category: "Aerodynamik",
    summary:
      "Allgemeine Betriebserlaubnis für die AutoExe Carbon-Frontlippe am Mazda RX-8. Montage gemäß Einbauanleitung, Sichtprüfung erforderlich.",
    vehicleFitment: ["Mazda RX-8", "Mazda RX-8 Spirit R"],
    conditions: [
      "Montage nur nach mitgelieferter Einbauanleitung",
      "Befestigungspunkte unverändert belassen",
      "Nach Einbau Sichtprüfung der Unterbodenfreiheit",
    ],
    fileName: "ABE_Carbon_Frontlippe_RX8.pdf",
    fileSize: "1,8 MB",
    pages: 3,
    scannedAt: "16.01.2025",
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
    vehicleFitment: ['Mazda RX-8 · 18"'],
    conditions: [
      "Nur freigegebene Rad-/Reifenkombination verwenden",
      "Anzugsmoment Radmuttern: 140 Nm",
      "Nach 50 km Nachziehen der Radmuttern",
    ],
    fileName: "ABE_RAYS_TE37_18.pdf",
    fileSize: "2,4 MB",
    pages: 4,
    scannedAt: "05.11.2024",
  },
  {
    id: "sport-federn",
    partName: "Sportfedern Tein",
    manufacturer: "Tein",
    documentLabel: "ABE · PDF",
    issuedAt: "22.08.2024",
    status: "gültig",
    authority: "TÜV / Hersteller",
    approvalNumber: "ABE TEIN-RX8-09",
    category: "Fahrwerk",
    summary:
      "Tieferlegung über Tein Sportfedern. Freigabe für RX-8, Achsvermessung nach Einbau empfohlen.",
    vehicleFitment: ["Mazda RX-8"],
    conditions: [
      "Achsvermessung nach Einbau empfohlen",
      "Restfederweg beachten",
      "Keine Kombination mit anderen Tieferlegungsteilen ohne Freigabe",
    ],
    fileName: "ABE_Tein_Sportfedern_RX8.pdf",
    fileSize: "1,2 MB",
    pages: 2,
    scannedAt: "24.08.2024",
  },
  {
    id: "exhaust",
    partName: "Racing Beat Abgasanlage",
    manufacturer: "Racing Beat",
    documentLabel: "Teilegutachten · PDF",
    issuedAt: "09.06.2024",
    status: "gültig",
    authority: "TÜV Süd",
    approvalNumber: "TG 2024-0612",
    category: "Abgasanlage",
    summary:
      "Teilegutachten für Racing Beat Cat-Back Abgasanlage. Eintragung erforderlich; Abgasverhalten gemäß Gutachten prüfen.",
    vehicleFitment: ["Mazda RX-8 Spirit R"],
    conditions: [
      "Eintragung in die Fahrzeugpapiere erforderlich",
      "Abgasverhalten gemäß Gutachten prüfen",
      "Katalysator-Position unverändert belassen",
    ],
    fileName: "TG_RacingBeat_Exhaust_RX8.pdf",
    fileSize: "3,1 MB",
    pages: 5,
    scannedAt: "12.06.2024",
  },
  {
    id: "spoiler",
    partName: "Carbon Heckspoiler",
    manufacturer: "Mazdaspeed",
    documentLabel: "ABE · PDF",
    issuedAt: "18.03.2024",
    status: "gültig",
    authority: "KBA",
    approvalNumber: "ABE KBA 44102",
    category: "Aerodynamik",
    summary:
      "ABE für Mazdaspeed Carbon-Heckspoiler. Befestigung nur auf originalem Kofferraumdeckel, keine zusätzliche Bohrung.",
    vehicleFitment: ["Mazda RX-8"],
    conditions: [
      "Nur auf originalem Kofferraumdeckel montieren",
      "Keine zusätzlichen Bohrungen",
      "Klebe- und Schraubverbindung gemäß Anleitung",
    ],
    fileName: "ABE_Mazdaspeed_Heckspoiler.pdf",
    fileSize: "0,9 MB",
    pages: 2,
    scannedAt: "20.03.2024",
  },
  {
    id: "intake",
    partName: "AEM Cold Air Intake",
    manufacturer: "AEM",
    documentLabel: "Teilegutachten · PDF",
    issuedAt: "02.12.2023",
    status: "gültig",
    authority: "TÜV Nord",
    approvalNumber: "TG 2023-1208",
    category: "Ansaugung",
    summary:
      "Teilegutachten AEM Cold-Air-Intake für den Renesis. Geräuschmessung und Sichtprüfung bei Eintragung.",
    vehicleFitment: ["Mazda RX-8", "Mazda RX-8 Spirit R"],
    conditions: [
      "Geräuschmessung bei Eintragung",
      "Sichtprüfung der Luftführung",
      "Originalen Luftmassenmesser weiterverwenden",
    ],
    fileName: "TG_AEM_Intake_RX8.pdf",
    fileSize: "2,0 MB",
    pages: 3,
    scannedAt: "04.12.2023",
  },
];

export function getAbeDocument(id: string): AbeDocument | undefined {
  return ABE_DOCUMENTS.find((doc) => doc.id === id);
}
