import type { Metadata } from "next";

import {
  LegalDocumentLayout,
  LegalParagraph,
  LegalSection,
  LegalUnorderedList,
} from "@/components/legal/legal-document-layout";
import {
  formatLegalAddress,
  legalMailtoHref,
  SITE_LEGAL,
} from "@/lib/legal/site-legal";

export const metadata: Metadata = {
  title: "Datenschutz · ZeloxTag",
  description: "Datenschutzerklärung für die ZeloxTag Web-App.",
};

export default function DatenschutzPage() {
  const address = formatLegalAddress();

  return (
    <LegalDocumentLayout
      title="Datenschutzerklärung (DSGVO)"
      description={`Teil 2 · ${SITE_LEGAL.appHost}`}
    >
      <LegalSection title="1. Verantwortlicher">
        <LegalParagraph>
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) für
          die Datenverarbeitung auf {SITE_LEGAL.appHost} ist:
        </LegalParagraph>
        <LegalParagraph>
          {SITE_LEGAL.operatorName}
          <br />
          {SITE_LEGAL.street}
          <br />
          {SITE_LEGAL.postalCode} {SITE_LEGAL.city}
          <br />
          E-Mail:{" "}
          <a
            href={legalMailtoHref()}
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            {SITE_LEGAL.email}
          </a>
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. Erhebung und Speicherung personenbezogener Daten">
        <LegalParagraph>
          <strong>a) Beim Aufruf der Web-App (Logfiles &amp; Hosting)</strong>
        </LegalParagraph>
        <LegalParagraph>
          Unsere Web-App wird bei externen Cloud-Infrastruktur-Diensten gehostet
          (Vercel Inc. sowie Supabase Inc.). Beim Aufruf von{" "}
          {SITE_LEGAL.appHost} werden durch den Browser automatisch Informationen
          an den Server übermittelt und in sogenannten Server-Logfiles
          gespeichert:
        </LegalParagraph>
        <LegalUnorderedList>
          <li>IP-Adresse des anfragenden Rechners</li>
          <li>Datum und Uhrzeit des Zugriffs</li>
          <li>Name und URL der abgerufenen Datei</li>
          <li>Browser-Typ und Betriebssystem</li>
        </LegalUnorderedList>
        <LegalParagraph>
          Die Verarbeitung erfolgt gemäß Art. 6 Abs. 1 lit. f DSGVO zur
          Gewährleistung eines reibungslosen Verbindungsaufbaus und der
          Systemsicherheit.
        </LegalParagraph>

        <LegalParagraph>
          <strong>b) Bei Registrierung und Nutzung des Benutzerkontos</strong>
        </LegalParagraph>
        <LegalParagraph>
          Zur Nutzung von ZeloxTag erheben wir folgende Daten:
        </LegalParagraph>
        <LegalUnorderedList>
          <li>E-Mail-Adresse</li>
          <li>Passwort (verschlüsselt gespeichert)</li>
          <li>
            Vom Nutzer eingegebene Fahrzeugdaten, Fahrgestellnummern (VIN),
            Wartungseinträge und hochgeladene Dokumente (z. B. Rechnungen,
            ABEs).
          </li>
        </LegalUnorderedList>
        <LegalParagraph>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Spezifische Funktionen & Dienstleister">
        <LegalParagraph>
          <strong>a) KI-Rechnungsscan (OCR-Extraktion)</strong>
        </LegalParagraph>
        <LegalParagraph>
          Wenn Sie die KI-Scan-Funktion nutzen, um Rechnungen oder Gutachten zu
          digitalisieren, wird das hochgeladene Bild/Dokument an unser
          angebundenes KI-Extraktionsmodell übermittelt. Das Dokument wird
          ausschließlich zur Extraktion von Textdaten (Teile, Beträge, Datum)
          analysiert und nicht zum Training öffentlicher KI-Modelle verwendet.
        </LegalParagraph>
        <LegalParagraph>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</LegalParagraph>

        <LegalParagraph>
          <strong>b) Zahlungsabwicklung via Stripe</strong>
        </LegalParagraph>
        <LegalParagraph>
          Für die Abwicklung kostenpflichtiger Abonnements nutzen wir den
          Zahlungsdienstleister Stripe Payments Europe, Ltd., 1 Grand Canal
          Street Lower, Grand Canal Dock, Dublin, Irland. Wir speichern selbst
          keine vollständigen Kreditkartendaten. Stripe verarbeitet Ihre
          Zahlungs- und Stammdaten zur Abwicklung der Abrechnung.
        </LegalParagraph>
        <LegalParagraph>
          Datenschutzerklärung von Stripe:{" "}
          <a
            href="https://stripe.com/de/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            https://stripe.com/de/privacy
          </a>
        </LegalParagraph>
        <LegalParagraph>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</LegalParagraph>

        <LegalParagraph>
          <strong>c) E-Mail-Versand via Resend</strong>
        </LegalParagraph>
        <LegalParagraph>
          Für den Versand von transaktionalen E-Mails (z. B. E-Mail-Bestätigung,
          Passwort-Reset) nutzen wir den Dienst Resend Inc.
        </LegalParagraph>
        <LegalParagraph>
          Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          an einer zuverlässigen Zustellung von System-E-Mails).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="4. Sichtbarkeit von Profilen & QR-Code-Scans (Zwei-Zonen-Prinzip)">
        <LegalParagraph>
          (1) Der Nutzer bestimmt in den Einstellungen der App selbst, welche
          Fahrzeugdaten beim Scannen des physischen ZeloxTags öffentlich sichtbar
          sind (z. B. Fahrzeugmodell, Ausstattungsliste, Instagram-Handle).
        </LegalParagraph>
        <LegalParagraph>
          (2) Vertrauliche Dokumente (z. B. Rechnungen mit Klarnamen oder
          Adressdaten) bleiben standardmäßig geschützt und sind für Dritte beim
          Scannen des Tags nicht einsehbar, es sei denn, der Nutzer schaltet
          diese explizit frei.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. Betroffenenrechte (Ihre Rechte nach DSGVO)">
        <LegalParagraph>
          Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie
          betreffenden personenbezogenen Daten:
        </LegalParagraph>
        <LegalUnorderedList>
          <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
          <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
          <li>Recht auf Löschung („Recht auf Vergessenwerden“) (Art. 17 DSGVO)</li>
          <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruchsrecht gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </LegalUnorderedList>
        <LegalParagraph>
          Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde
          über die Verarbeitung Ihrer personenbezogenen Daten durch uns zu
          beschweren.
        </LegalParagraph>
        <LegalParagraph>
          Anfragen richten Sie bitte an{" "}
          <a
            href={legalMailtoHref()}
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            {SITE_LEGAL.email}
          </a>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="6. Datensicherheit">
        <LegalParagraph>
          Wir nutzen innerhalb des Web-App-Besuchs das verbreitete SSL/TLS-Verfahren
          in Verbindung mit der jeweils höchsten Stand-Verschlüsselungsstufe, die
          von Ihrem Browser unterstützt wird.
        </LegalParagraph>
      </LegalSection>

      <LegalParagraph>
        <em className="text-[0.82rem] text-[color:var(--vd-muted)]">
          Hinweis: Dieser Text stellt einen rechtlich fundierten Entwurf dar, der
          auf das geschilderte technische Setup angepasst ist, und ersetzt im
          Zweifel keine Einzelfallprüfung durch einen spezialisierten
          Rechtsanwalt. Verantwortlicher: {SITE_LEGAL.operatorName}, {address}.
        </em>
      </LegalParagraph>
    </LegalDocumentLayout>
  );
}
