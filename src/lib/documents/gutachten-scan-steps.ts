import type {
  GuideFrameType,
  GuideSectionAnchor,
} from "@/components/documents/in-browser-camera";
import {
  GUTACHTEN_SUBTYPE_LABELS,
  type GutachtenDocumentSubtype,
} from "@/lib/validations/gutachtenSchema";

export type GutachtenFollowUpStep = {
  id: string;
  title: string;
  hint: string;
  guideLabel: string;
  guideFrame: GuideFrameType;
  guideSectionAnchor?: GuideSectionAnchor;
  guideFrameDimOutside?: boolean;
  a4AutoCrop?: boolean;
  enforceCaptureQuality?: boolean;
  skippable?: boolean;
  skipLabel?: string;
};

export function gutachtenFollowUpSteps(
  subtype: GutachtenDocumentSubtype,
): GutachtenFollowUpStep[] {
  switch (subtype) {
    case "TEILEGUTACHTEN":
      return [
        {
          id: "marking",
          title: "Kennzeichnung am Bauteil",
          hint: "Aufdruck, Prägung oder Typenschild — Art und Nummer müssen lesbar sein",
          guideLabel: "Kennzeichnung — Art & Nummer",
          guideFrame: "section",
          guideSectionAnchor: "center",
          a4AutoCrop: false,
          enforceCaptureQuality: true,
          skippable: true,
          skipLabel: "Überspringen — in Review nachtragen",
        },
        {
          id: "auflagen",
          title: "Punkt IV · Auflagen",
          hint: "Abschnitt IV · Auflagen und Hinweise vollständig erfassen",
          guideLabel: "IV. Auflagen und Hinweise",
          guideFrame: "section",
          guideSectionAnchor: "top",
          skippable: true,
          skipLabel: "Überspringen — in Review nachtragen",
        },
        {
          id: "verwendungsbereich",
          title: "Verwendungsbereich",
          hint: "Komplette Fahrzeug-Tabelle mit allen Spalten und Zeilen",
          guideLabel: "Verwendungsbereich — alle Zeilen",
          guideFrame: "table",
          skippable: true,
          skipLabel: "Überspringen — in Review nachtragen",
        },
      ];
    case "EINZELABNAHME":
      return [
        {
          id: "field22",
          title: "Feld 22 · Bemerkungen",
          hint: "Feld 22 und ggf. Zusätzliche Bemerkungen zur Fahrzeugbeschreibung — Text vollständig",
          guideLabel: "Feld 22 · Änderungen / Bemerkungen",
          guideFrame: "section",
          guideSectionAnchor: "center",
          skippable: true,
          skipLabel: "Überspringen — Titelseite reicht",
        },
      ];
    case "ANBAUBESTAETIGUNG":
      return [
        {
          id: "gutachten-be",
          title: "Gutachten zur Erlangung",
          hint: "Gutachten zur Erlangung der Betriebserlaubnis — Kopfbereich mit Fahrzeugdaten",
          guideLabel: "Gutachten zur Erlangung der BE",
          guideFrame: "a4",
          guideFrameDimOutside: true,
          guideSectionAnchor: "top",
        },
        {
          id: "vorschriften",
          title: "Technische Vorschriften",
          hint: "Aufstellung der technischen Vorschriften — begutachtete Änderungen",
          guideLabel: "Aufstellung techn. Vorschriften",
          guideFrame: "a4",
          guideFrameDimOutside: true,
          guideSectionAnchor: "top",
          skippable: true,
          skipLabel: "Überspringen — nur Gutachten übernommen",
        },
      ];
    default:
      return [];
  }
}

export function gutachtenTotalCaptureSteps(
  subtype: GutachtenDocumentSubtype,
): number {
  return 1 + gutachtenFollowUpSteps(subtype).length;
}

export function gutachtenSubtypeBriefing(
  subtype: GutachtenDocumentSubtype,
  partName?: string | null,
): { headline: string; body: string } {
  const label = GUTACHTEN_SUBTYPE_LABELS[subtype];
  const part = partName?.trim() ? ` · ${partName.trim()}` : "";
  const followUps = gutachtenFollowUpSteps(subtype);

  if (followUps.length === 0) {
    return {
      headline: `${label}${part}`,
      body: "Dokument erkannt. Prüfe die extrahierten Daten im nächsten Schritt.",
    };
  }

  const nextTitles = followUps.map((step) => step.title).join(" → ");
  return {
    headline: `Erkannt: ${label}${part}`,
    body: `Als Nächstes: ${nextTitles}. Jeder Schritt öffnet die Kamera mit passender Anleitung.`,
  };
}
