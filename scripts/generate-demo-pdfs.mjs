#!/usr/bin/env node
/**
 * Generates static demo PDFs under public/demo/ for the E36 mock twin.
 * Run: node scripts/generate-demo-pdfs.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "demo");

const SPECS = [
  {
    file: "abe-frontlippe.pdf",
    title: "Allgemeine Betriebserlaubnis",
    subtitle: "M-Tech Frontspoiler · BMW 3er E36",
    lines: [
      "ABE KBA 48571",
      "Hersteller: M-Tech / AC Schnitzer",
      "Auflagen: Montage gemäß Einbauanleitung",
      "Sichtprüfung Unterbodenfreiheit erforderlich",
    ],
  },
  {
    file: "abe-kw-v1.pdf",
    title: "Teilegutachten",
    subtitle: "KW V1 Coilover · BMW 3er E36",
    lines: [
      "TG-E36-KW-2019 · TÜV Süd",
      "Einbau nur durch Fachbetrieb",
      "Achsvermessung nach Montage",
    ],
  },
  {
    file: "invoice-oil.pdf",
    title: "Werkstattrechnung (Demo)",
    subtitle: "Ölwechsel · BMW 328i E36",
    lines: [
      "Arbeitslohn Ölwechsel        89,00 €",
      "Motoröl 5W-40 (6,5 l)       198,50 €",
      "Ölfilter-Satz                42,90 €",
      "Entsorgungsgebühr            16,50 €",
      "MwSt. 19 %                   68,40 €",
      "Summe                       415,30 €",
    ],
  },
  {
    file: "invoice-carbon.pdf",
    title: "Werkstattrechnung (Demo)",
    subtitle: "Seibon Carbon Haube",
    lines: [
      "Seibon Carbon Motorhaube       986,50 €",
      "Montage & Verklebung           180,00 €",
      "MwSt. 19 %                     157,54 €",
    ],
  },
  {
    file: "invoice-rays.pdf",
    title: "Werkstattrechnung (Demo)",
    subtitle: "RAYS Volk TE37",
    lines: [
      "RAYS Volk TE37 Satz            665,60 €",
      "Reifen Michelin PS4S           890,00 €",
      "Auswuchten & Montage           120,00 €",
    ],
  },
  {
    file: "invoice-tein.pdf",
    title: "Werkstattrechnung (Demo)",
    subtitle: "Tein Flex Z",
    lines: [
      "Tein Flex Z Dämpfer VA/HA     489,00 €",
      "Federn & Domlager             210,00 €",
      "Einbau Fachwerkstatt          245,00 €",
    ],
  },
  {
    file: "invoice-brakes.pdf",
    title: "Werkstattrechnung (Demo)",
    subtitle: "Kupplung / Bremsen",
    lines: [
      "Kupplungssatz Sachs            489,00 €",
      "Schwungrad leicht              320,00 €",
      "Arbeitslohn                    420,00 €",
      "MwSt. 19 %                     235,60 €",
    ],
  },
  {
    file: "invoice-exhaust.pdf",
    title: "Werkstattrechnung (Demo)",
    subtitle: "Remus Sportauspuff",
    lines: [
      "Remus Sportauspuff E36         890,00 €",
      "Arbeitslohn Auspuff            180,00 €",
      "Montagematerial                 45,00 €",
    ],
  },
  {
    file: "tuev-hu.pdf",
    title: "TÜV Bericht (Demo)",
    subtitle: "Hauptuntersuchung · HU",
    lines: [
      "Prüfstelle: TÜV Süd",
      "Ergebnis: ohne Mängel",
      "Nächste HU: 07/2026",
    ],
  },
];

async function buildPdf({ title, subtitle, lines }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  page.drawText(title, { x: 48, y, size: 20, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 28;
  page.drawText(subtitle, { x: 48, y, size: 12, font, color: rgb(0.25, 0.25, 0.25) });
  y -= 36;
  page.drawText("ZeloxTag Demo · nicht rechtsverbindlich", {
    x: 48,
    y,
    size: 9,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });
  y -= 40;

  for (const line of lines) {
    page.drawText(line, { x: 48, y, size: 11, font, color: rgb(0.15, 0.15, 0.15) });
    y -= 20;
  }

  return doc.save();
}

await mkdir(outDir, { recursive: true });

for (const spec of SPECS) {
  const bytes = await buildPdf(spec);
  const target = path.join(outDir, spec.file);
  await writeFile(target, bytes);
  console.log("wrote", spec.file);
}
