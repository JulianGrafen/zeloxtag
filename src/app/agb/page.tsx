import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalDocumentLayout,
  LegalSection,
} from "@/components/legal/legal-document-layout";
import {
  PRO_PLAN_MONTHLY_PRICE,
  PRO_PLAN_NAME,
  PRO_TRIAL_DAYS,
} from "@/lib/billing/pro-plan";
import { SITE_LEGAL } from "@/lib/legal/site-legal";

export const metadata: Metadata = {
  title: "AGB · ZeloxTag",
  description: "Allgemeine Geschäftsbedingungen für die Nutzung von ZeloxTag.",
};

export default function AgbPage() {
  return (
    <LegalDocumentLayout
      title="Allgemeine Geschäftsbedingungen"
      description={`Stand: ${new Date().getFullYear()} · ${SITE_LEGAL.brand}`}
    >
      <LegalSection title="§ 1 Geltungsbereich">
        <p>
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung
          der Plattform {SITE_LEGAL.brand} unter {SITE_LEGAL.website} sowie
          verbundener Dienste. Abweichende Bedingungen des Nutzers werden nicht
          anerkannt, es sei denn, wir stimmen ihrer Geltung ausdrücklich
          schriftlich zu.
        </p>
      </LegalSection>

      <LegalSection title="§ 2 Vertragsgegenstand">
        <p>
          {SITE_LEGAL.brand} verbindet ein physisches QR-Tag am Fahrzeug mit
          einer digitalen Fahrzeugakte. Nutzer können Fahrzeuge verknüpfen,
          Dokumente (z. B. Rechnungen, ABEs, TÜV-Berichte) speichern und —
          abhängig vom gewählten Tarif — erweiterte Funktionen wie KI-gestützte
          Dokumentenerkennung und Cloud-Synchronisation nutzen.
        </p>
      </LegalSection>

      <LegalSection title="§ 3 Registrierung und Konto">
        <p>
          Für die Nutzerkonto-Funktionen ist eine Registrierung mit gültiger
          E-Mail-Adresse und sicherem Passwort erforderlich. Der Nutzer ist
          verpflichtet, Zugangsdaten geheim zu halten und unverzüglich zu
          informieren, wenn unbefugter Zugriff vermutet wird.
        </p>
        <p>
          Mit der Registrierung bestätigt der Nutzer, volljährig und
          geschäftsfähig zu sein bzw. mit Zustimmung eines
          Erziehungsberechtigten zu handeln.
        </p>
      </LegalSection>

      <LegalSection title="§ 4 Leistungen und Tarife">
        <p>
          <strong>Kostenlose Basis:</strong> Die öffentliche Fahrzeug-Visitenkarte
          nach QR-Scan kann ohne kostenpflichtiges Abo genutzt werden, soweit im
          Produkt ausgewiesen.
        </p>
        <p>
          <strong>{PRO_PLAN_NAME}:</strong> Erweiterte Cloud-Funktionen (u. a.
          Dokumentenakte, KI-Scan, Verlauf) sind über das kostenpflichtige Abo
          verfügbar. Neue Abonnenten erhalten {PRO_TRIAL_DAYS} Tage
          kostenlose Testphase. Danach gilt der Preis von {PRO_PLAN_MONTHLY_PRICE}{" "}
          pro Monat, sofern nicht abweichend im Checkout ausgewiesen.
        </p>
      </LegalSection>

      <LegalSection title="§ 5 Preise, Zahlung und Abrechnung">
        <p>
          Zahlungen für {PRO_PLAN_NAME} werden über den Zahlungsdienstleister
          Stripe abgewickelt. Es gelten die im Checkout angezeigten Preise
          inklusive gesetzlicher Umsatzsteuer, sofern ausgewiesen.
        </p>
        <p>
          Das Abonnement verlängert sich automatisch um jeweils einen Monat,
          sofern es nicht fristgerecht gekündigt wird. Kündigungen sind über
          die Aboverwaltung bzw. den Stripe-Kundenbereich möglich.
        </p>
      </LegalSection>

      <LegalSection title="§ 6 Pflichten des Nutzers">
        <p>
          Der Nutzer ist für alle Inhalte verantwortlich, die er hochlädt oder
          veröffentlicht. Insbesondere dürfen keine rechtswidrigen, irreführenden
          oder fremde Rechte verletzenden Inhalte verwendet werden.
        </p>
        <p>
          Der Nutzer stellt {SITE_LEGAL.companyName} von Ansprüchen Dritter frei,
          die aus einer schuldhaften Verletzung dieser Pflichten entstehen.
        </p>
      </LegalSection>

      <LegalSection title="§ 7 Verfügbarkeit">
        <p>
          Wir bemühen uns um eine hohe Verfügbarkeit des Dienstes. Wartungen,
          technische Störungen oder höhere Gewalt können jedoch zu
          vorübergehenden Einschränkungen führen. Ein Anspruch auf
          ununterbrochene Verfügbarkeit besteht nicht.
        </p>
      </LegalSection>

      <LegalSection title="§ 8 Haftung">
        <p>
          Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie
          bei Schäden aus der Verletzung des Lebens, des Körpers oder der
          Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher
          Vertragspflichten ist die Haftung auf den vertragstypischen,
          vorhersehbaren Schaden begrenzt.
        </p>
        <p>
          Für von Nutzern hochgeladene Dokumente und deren inhaltliche Richtigkeit
          übernehmen wir keine Gewähr. KI-gestützte Erkennung dient der
          Unterstützung — der Nutzer prüft erkannte Daten vor dem Speichern.
        </p>
      </LegalSection>

      <LegalSection title="§ 9 Laufzeit und Kündigung">
        <p>
          Das Nutzerkonto kann jederzeit durch Löschungsanfrage an{" "}
          <a
            href={`mailto:${SITE_LEGAL.email}`}
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            {SITE_LEGAL.email}
          </a>{" "}
          beendet werden. Kostenpflichtige Abos enden zusätzlich mit wirksamer
          Kündigung des Abonnements gemäß § 5.
        </p>
      </LegalSection>

      <LegalSection title="§ 10 Datenschutz">
        <p>
          Informationen zur Verarbeitung personenbezogener Daten werden in
          unserer Datenschutzerklärung bereitgestellt. Bei Fragen wende dich an{" "}
          <a
            href={`mailto:${SITE_LEGAL.email}`}
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            {SITE_LEGAL.email}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="§ 11 Schlussbestimmungen">
        <p>Es gilt das Recht der Bundesrepublik Deutschland.</p>
        <p>
          Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit
          der übrigen Regelungen unberührt.
        </p>
        <p>
          Anbieter im Sinne dieser AGB: {SITE_LEGAL.companyName}. Weitere
          Angaben findest du im{" "}
          <Link
            href="/impressum"
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            Impressum
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
