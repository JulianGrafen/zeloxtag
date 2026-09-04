import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalDocumentLayout,
  LegalOrderedList,
  LegalParagraph,
  LegalSection,
  LegalUnorderedList,
} from "@/components/legal/legal-document-layout";
import { PRO_PLAN_ANNUAL_PRICE, PRO_PLAN_MONTHLY_PRICE } from "@/lib/billing/pro-plan";
import {
  formatLegalProviderInline,
  legalMailtoHref,
  SITE_LEGAL,
} from "@/lib/legal/site-legal";

export const metadata: Metadata = {
  title: "AGB · ZeloxTag",
  description: "Allgemeine Geschäftsbedingungen für die Nutzung von ZeloxTag.",
};

const provider = formatLegalProviderInline();

export default function AgbPage() {
  return (
    <LegalDocumentLayout
      title="Allgemeine Geschäftsbedingungen (AGB)"
      description={`Teil 1 · ${SITE_LEGAL.appHost}`}
    >
      <LegalSection title="1. Geltungsbereich und Vertragspartner">
        <LegalOrderedList>
          <li>
            Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB“) gelten
            für alle Verträge über die Nutzung der Web-Anwendung unter{" "}
            {SITE_LEGAL.appHost} (nachfolgend „ZeloxTag-App“) zwischen dem
            Betreiber {provider} (nachfolgend „Anbieter“) und dem Kunden
            (nachfolgend „Nutzer“).
          </li>
          <li>
            Das Angebot richtet sich sowohl an Verbraucher im Sinne des § 13
            BGB als auch an Unternehmer im Sinne des § 14 BGB.
          </li>
          <li>
            Abweichende oder ergänzende Bedingungen des Nutzers werden nicht
            Vertragsbestandteil, es sei denn, der Anbieter stimmt ihrer Geltung
            ausdrücklich schriftlich zu.
          </li>
        </LegalOrderedList>
      </LegalSection>

      <LegalSection title="2. Leistungsgegenstand und Leistungsstufen">
        <LegalOrderedList>
          <li>
            Der Anbieter stellt unter {SITE_LEGAL.appHost} eine cloudbasierte
            Softwarelösung (SaaS) zur digitalen Dokumentation und Verwaltung von
            Fahrzeugdaten, Umbauten, Wartungen und Zubehör zur Verfügung. Das
            System funktioniert in Kombination mit oder unabhängig von physischen
            ZeloxTag-QR-Plaketten.
          </li>
          <li>
            <strong>Kostenfreie Basis-Version („ZeloxTag Free“):</strong>
            <LegalUnorderedList>
              <li>
                Bereitstellung einer digitalen Fahrzeug-Visitenkarte / eines
                Basis-Fahrzeugprofils.
              </li>
              <li>
                Zuordnung und Freischaltung von physischen ZeloxTag-Plaketten.
              </li>
              <li>
                Manuelle Erfassung von Wartungen, Umbauten und Fahrzeugdaten.
              </li>
              <li>
                Anonymisierter Lese-Zugriff für Dritte beim Scannen des
                QR-Codes (sofern vom Nutzer freigegeben).
              </li>
            </LegalUnorderedList>
          </li>
          <li>
            <strong>Kostenpflichtiges Abonnement („ZeloxTag Pro“):</strong>
            <LegalUnorderedList>
              <li>
                Erweiterter Funktionsumfang inkl. KI-gestützter automatischer
                Extraktion von Rechnungs- und Werkstattdaten (KI-Scan).
              </li>
              <li>
                Unbegrenzter Cloud-Speicher für ABEs, Gutachten und
                Fahrzeugdokumente.
              </li>
              <li>
                Erweiterte Verwaltungsfunktionen (z. B. Verfassung von
                Verkaufsexposés, Multi-Garage-Verwaltung).
              </li>
            </LegalUnorderedList>
          </li>
        </LegalOrderedList>
      </LegalSection>

      <LegalSection title="3. Registrierung und Account-Sicherheit">
        <LegalOrderedList>
          <li>
            Die Nutzung der ZeloxTag-App setzt die Erstellung eines
            Benutzerkontos voraus. Der Nutzer verpflichtet sich, bei der
            Registrierung wahrheitsgemäße Angaben zu machen.
          </li>
          <li>
            Der Nutzer ist verpflichtet, seine Zugangsdaten geheim zu halten und
            vor dem Zugriff Dritter zu schützen.
          </li>
        </LegalOrderedList>
      </LegalSection>

      <LegalSection title="4. Preise, Zahlungsbedingungen und Abrechnung">
        <LegalOrderedList>
          <li>Die Nutzung der Basis-Version ist dauerhaft kostenlos.</li>
          <li>
            Die Entgelte für das Pro-Abonnement richten sich nach der aktuellen
            Preisliste auf der Website (z. B. {PRO_PLAN_MONTHLY_PRICE} inkl.
            MwSt. pro Monat oder {PRO_PLAN_ANNUAL_PRICE} inkl. MwSt. pro Jahr).
          </li>
          <li>
            Die Zahlungsabwicklung erfolgt über den externen Zahlungsdienstleister
            Stripe Payments Europe, Ltd. Die Vergütung wird jeweils zu Beginn des
            gewählten Abrechnungszeitraums (monatlich oder jährlich) im Voraus
            fällig und über das gewählte Zahlungsmittel eingezogen.
          </li>
        </LegalOrderedList>
      </LegalSection>

      <LegalSection title="5. Vertragslaufzeit und Kündigung">
        <LegalOrderedList>
          <li>
            Das kostenlose Basis-Konto wird auf unbestimmte Zeit geschlossen und
            kann vom Nutzer jederzeit ohne Einhaltung einer Frist durch Löschung
            des Accounts oder Kündigung in der App beendet werden.
          </li>
          <li>
            Das kostenpflichtige Pro-Abonnement verlängert sich automatisch
            jeweils um einen weiteren Monat bzw. um ein weiteres Jahr, wenn es
            nicht vor Ablauf des aktuellen Abrechnungszeitraums gekündigt wird.
          </li>
          <li>
            Die Kündigung des Pro-Abonnements kann jederzeit mit wenigen Klicks
            direkt in den Account-Einstellungen der App oder über das
            Stripe-Kundenportal durchgeführt werden. Nach der Kündigung bleibt
            der Pro-Zugriff bis zum Ende der bereits bezahlten Laufzeit aktiv
            und wechselt anschließend automatisch in die kostenfreie
            Basis-Version.
          </li>
        </LegalOrderedList>
      </LegalSection>

      <LegalSection title="6. Eigenverantwortung des Nutzers und StVZO-Hinweis">
        <LegalOrderedList>
          <li>
            <strong>Keine amtliche Gültigkeit:</strong> Die ZeloxTag-App ist ein
            privates Dokumentenmanagement-Tool. Sie ersetzt nicht die gesetzlichen
            Mitführpflichten von Originaldokumenten (z. B. Zulassungsbescheinigung
            Teil I, ABE-Originalausdrucke, Teilegutachten) gemäß der
            Straßenverkehrs-Zulassungs-Ordnung (StVZO).
          </li>
          <li>
            Der Nutzer ist selbst dafür verantwortlich, bei
            Straßenverkehrskontrollen oder Prüfterminen (z. B. TÜV) die gesetzlich
            geforderten Originaldokumente mitzuführen.
          </li>
          <li>
            Der Nutzer verpflichtet sich, keine rechtswidrigen, Urheberrechte
            verletzenden oder unangemessenen Inhalte (z. B. gefälschte Gutachten
            oder beleidigende Medien) auf die Server hochzuladen.
          </li>
        </LegalOrderedList>
      </LegalSection>

      <LegalSection title="7. Haftungsbeschränkung">
        <LegalOrderedList>
          <li>
            Der Anbieter haftet unbeschränkt für Vorsatz und grobe
            Fahrlässigkeit sowie nach dem Produkthaftungsgesetz.
          </li>
          <li>
            Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung
            einer wesentlichen Vertragspflicht (Kardinalpflicht). In diesem Fall
            ist die Haftung auf den vorhersehbaren, vertragstypischen Schaden
            begrenzt.
          </li>
          <li>
            Der Anbieter übernimmt keine Haftung für den Verlust von Daten,
            sofern der Schaden darauf beruht, dass es der Nutzer unterlassen hat,
            eigene Sicherungen der hochgeladenen Dokumente anzulegen.
          </li>
        </LegalOrderedList>
      </LegalSection>

      <LegalSection title="8. Widerrufsbelehrung für Verbraucher (Digitale Inhalte)">
        <LegalParagraph>
          <strong>Widerrufsrecht</strong>
        </LegalParagraph>
        <LegalParagraph>
          Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen
          diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage
          ab dem Tag des Vertragsschlusses. Um Ihr Widerrufsrecht auszuüben,
          müssen Sie uns ({provider},{" "}
          <a
            href={legalMailtoHref()}
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            {SITE_LEGAL.email}
          </a>
          ) mittels einer eindeutigen Erklärung über Ihren Entschluss informieren.
        </LegalParagraph>
        <LegalParagraph>
          <strong>Erlöschen des Widerrufsrechts</strong>
        </LegalParagraph>
        <LegalParagraph>
          Das Widerrufsrecht erlischt bei einem Vertrag über die Lieferung von
          nicht auf einem körperlichen Datenträger befindlichen digitalen
          Inhalten, wenn wir mit der Ausführung des Vertrags begonnen haben,
          nachdem Sie ausdrücklich zugestimmt haben, dass wir mit der Ausführung
          des Vertrags vor Ablauf der Widerrufsfrist beginnen, und Sie Ihre
          Kenntnis davon bestätigt haben, dass Sie durch Ihre Zustimmung mit
          Beginn der Ausführung des Vertrags Ihr Widerrufsrecht verlieren.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="9. Schlussbestimmungen">
        <LegalOrderedList>
          <li>
            Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
            UN-Kaufrechts.
          </li>
          <li>
            Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt der Vertrag
            im Übrigen wirksam.
          </li>
        </LegalOrderedList>
        <LegalParagraph>
          Weitere Anbieterangaben findest du im{" "}
          <Link
            href="/impressum"
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            Impressum
          </Link>
          . Informationen zur Datenverarbeitung findest du in der{" "}
          <Link
            href="/datenschutz"
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            Datenschutzerklärung
          </Link>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalParagraph>
        <em className="text-[0.82rem] text-[color:var(--vd-muted)]">
          Hinweis: Dieser Text stellt einen rechtlich fundierten Entwurf dar, der
          auf das technische Setup angepasst ist, und ersetzt im Zweifel keine
          Einzelfallprüfung durch einen spezialisierten Rechtsanwalt.
        </em>
      </LegalParagraph>
    </LegalDocumentLayout>
  );
}
