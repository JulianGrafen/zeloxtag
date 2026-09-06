import type { Metadata } from "next";

import {
  LegalDocumentLayout,
  LegalParagraph,
  LegalSection,
  LegalUnorderedList,
} from "@/components/legal/legal-document-layout";
import { legalMailtoHref, SITE_LEGAL } from "@/lib/legal/site-legal";

export const metadata: Metadata = {
  title: "Datenschutz · ZeloxTag",
  description: "Datenschutzerklärung für die ZeloxTag Web-App.",
};

export default function DatenschutzPage() {
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
        <LegalUnorderedList>
          <li>
            Unsere Web-App wird bei externen Cloud-Infrastruktur-Diensten
            (Vercel Inc. sowie Supabase Inc.) gehostet. Beim Aufruf von{" "}
            {SITE_LEGAL.appHost} werden durch den Browser automatisch
            Informationen an den Server übermittelt (z.&nbsp;B. IP-Adresse, Datum
            und Uhrzeit, Name der abgerufenen Datei, Browser-Typ).
          </li>
          <li>
            Die Datenverarbeitung und Speicherung durch Vercel erfolgt
            ausschließlich in der EU bzw. im EWR, konkret in Frankfurt am Main.
          </li>
          <li>
            Mit Vercel wurde bei der Kontoerstellung ein entsprechender
            Auftragsverarbeitungsvertrag (DPA/AVV) abgeschlossen.
          </li>
          <li>
            Vercel nutzt IP-Adressen im Rahmen berechtigter Interessen (Art. 6
            Abs. 1 lit. f DSGVO) zur Angriffsabwehr (z.&nbsp;B. DDoS-Schutz)
            und für die integrierte Firewall.
          </li>
          <li>
            Die Speicherdauer der Server- und Access-Logs ist abhängig vom
            gewählten Vercel-Plan: Im kostenlosen Tarif werden Logs für 1 Stunde,
            im Pro-Tarif für 24 Stunden und bei Nutzung von „Observability
            Plus“ für bis zu 30 Tage gespeichert.
          </li>
        </LegalUnorderedList>

        <LegalParagraph>
          <strong>b) Bei Registrierung und Nutzung des Benutzerkontos</strong>
        </LegalParagraph>
        <LegalUnorderedList>
          <li>
            Zur Nutzung von ZeloxTag erheben wir Ihre E-Mail-Adresse, das
            Passwort (verschlüsselt gespeichert), eingegebene Fahrzeugdaten (wie
            die VIN) sowie hochgeladene Dokumente (z.&nbsp;B. Rechnungen, ABEs).
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </li>
          <li>
            Als zentrale Datenbankarchitektur setzen wir ein relationales
            PostgreSQL-Datenbanksystem (v15+) via Supabase ein, welches im
            Rechenzentrum Frankfurt am Main gehostet wird.
          </li>
          <li>
            Sämtliche Datenbankinhalte und verknüpften Speicherobjekte werden
            durchgehend nach aktuellen Industriestandards verschlüsselt.
          </li>
        </LegalUnorderedList>

        <LegalParagraph>
          <strong>c) Cookies &amp; Consent</strong>
        </LegalParagraph>
        <LegalUnorderedList>
          <li>
            Für das Einholen und Verwalten von Nutzereinwilligungen setzen wir
            das Cookie-Consent-Tool Cookiebot ein.
          </li>
          <li>
            Vor der ausdrücklichen Einwilligung des Nutzers werden auf unserer
            Website ausschließlich technisch zwingend erforderliche
            First-Party-Cookies gesetzt.
          </li>
          <li>Aktuell nutzen wir keine Google-Analytics-Version.</li>
        </LegalUnorderedList>
      </LegalSection>

      <LegalSection title="3. Spezifische Funktionen, Dokumentenspeicherung & Dienstleister">
        <LegalParagraph>
          <strong>a) Speicherung von Dokumenten (PDFs)</strong>
        </LegalParagraph>
        <LegalUnorderedList>
          <li>
            Die Speicherung hochgeladener Dokumente erfolgt in Supabase Storage
            auf Basis einer AWS S3-Infrastruktur mit ausschließlichem
            Speicherort in Frankfurt am Main.
          </li>
          <li>
            Alle gespeicherten PDFs werden im Ruhezustand (Data at Rest)
            standardmäßig mittels AES-256 (Server-Side Encryption) verschlüsselt.
          </li>
          <li>
            Jede Datenübertragung (Upload und Download) erfolgt zwingend über
            HTTPS und ist via TLS 1.2 bzw. TLS 1.3 transportverschlüsselt.
          </li>
          <li>
            Die Dokumente werden in nicht-öffentlichen Buckets (Private Storage)
            gespeichert und Zugriffe werden mandantenspezifisch isoliert,
            authentifiziert (JWT) und über PostgreSQL Row-Level Security (RLS)
            autorisiert.
          </li>
          <li>
            Die Bereitstellung zur Anzeige oder zum Download erfolgt über
            kryptografisch signierte URLs mit kurzer, definierter
            Gültigkeitsdauer.
          </li>
        </LegalUnorderedList>

        <LegalParagraph>
          <strong>b) KI-Rechnungsscan (OCR-Extraktion)</strong>
        </LegalParagraph>
        <LegalUnorderedList>
          <li>
            Zur automatisierten Analyse von PDFs (z.&nbsp;B. Extraktion von
            Bauteilen, KBA-Nummern oder Kosten) nutzen wir OpenAI-Modelle
            (aktuell GPT-5.4), die über Microsoft Azure in der Region Germany
            West Central (Frankfurt) gehostet werden.
          </li>
          <li>
            Es werden Bilddateien, PDFs und die darin enthaltenen Text- und
            Metadaten (inklusive personenbezogener Daten wie Name oder
            Rechnungsanschrift) zur Verarbeitung an die Schnittstelle
            übertragen.
          </li>
          <li>
            Eine automatische Vorab-Anonymisierung der Daten findet bewusst nicht
            statt, um gesetzliche Dokumentationspflichten in der Lieferkette
            (z.&nbsp;B. gemäß REACH) zu erfüllen.
          </li>
          <li>
            Die übertragenen Dokumente und Prompts werden von Microsoft oder
            Dritten zu keinem Zeitpunkt für das Training oder die Verbesserung
            von KI-Modellen verwendet.
          </li>
          <li>
            Die Verarbeitung erfolgt zustandslos (stateless) und die
            Zwischenspeicherung wird durch eine vertraglich vereinbarte
            Zero-Data-Retention-Policy (ZDR), deren Beantragung aktuell läuft,
            vollständig unterbunden.
          </li>
        </LegalUnorderedList>

        <LegalParagraph>
          <strong>c) Zahlungsabwicklung via Stripe</strong>
        </LegalParagraph>
        <LegalParagraph>
          Für die Abwicklung kostenpflichtiger Abonnements nutzen wir den
          Zahlungsdienstleister Stripe Payments Europe, Ltd., Irland. Wir
          speichern selbst keine vollständigen Kreditkartendaten.
          Datenschutzerklärung von Stripe:{" "}
          <a
            href="https://stripe.com/de/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            https://stripe.com/de/privacy
          </a>
          . Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
        </LegalParagraph>

        <LegalParagraph>
          <strong>d) E-Mail-Versand via Resend</strong>
        </LegalParagraph>
        <LegalParagraph>
          Für den Versand von transaktionalen E-Mails nutzen wir den Dienst
          Resend Inc. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="4. Sichtbarkeit von Profilen & QR-Code-Scans (Zwei-Zonen-Prinzip)">
        <LegalUnorderedList>
          <li>
            Der Nutzer bestimmt in den Einstellungen der App selbst, welche
            Fahrzeugdaten beim Scannen des physischen ZeloxTags öffentlich
            sichtbar sind.
          </li>
          <li>
            Endkunden und Dritte erhalten ausschließlich Zugriff auf Dokumente,
            die durch den Nutzer ausdrücklich für das öffentliche Profil
            (&apos;Public Tier&apos;) freigegeben wurden.
          </li>
          <li>
            Alle übrigen, vertraulichen Dokumente verbleiben in
            zugriffsgeschützten, privaten Speicherbereichen und sind nicht über
            permanente, öffentliche Direkt-URLs aus dem offenen Internet
            erreichbar.
          </li>
        </LegalUnorderedList>
      </LegalSection>

      <LegalSection title="5. Vertragsbeendigung, Löschung & Backups">
        <LegalParagraph>
          Nach der Kündigung oder dem Ablauf eines Vertrages durchläuft das
          Kundenkonto einen automatisierten Lebenszyklus zur Gewährleistung der
          DSGVO-Vorgaben:
        </LegalParagraph>
        <LegalUnorderedList>
          <li>
            <strong>Grace Period:</strong> Mit Ablauf des Abos wird das Konto
            für 30 Tage in einen &quot;Gesperrt / Read-Only&quot;-Status
            versetzt. Der Nutzer erhält die Möglichkeit, seine Akte als
            ZIP-Archiv herunterzuladen.
          </li>
          <li>
            <strong>Hard Delete:</strong> Nach 30 Tagen werden alle
            hochgeladenen PDFs physisch und unwiderruflich aus dem
            Storage-Bucket in Frankfurt gelöscht. Die dazugehörigen
            Datenbankeinträge werden per Cascading Delete bereinigt. Öffentliche
            Links zum Profil werden gelöscht.
          </li>
          <li>
            <strong>Steuerliche Aufbewahrung:</strong> Transaktions- und
            Rechnungsdaten bei Stripe bleiben von der Löschung unberührt und
            werden entsprechend der gesetzlichen 10-jährigen Aufbewahrungsfrist
            (GoBD / § 147 AO) archiviert.
          </li>
          <li>
            <strong>Backups:</strong> Disaster-Recovery-Backups der Dokumente und
            Datenbank-Metadaten werden mandantenisoliert, georedundant in der EU
            (AES-256 verschlüsselt) gespeichert und nach maximal 30 Tagen
            automatisiert überschrieben.
          </li>
        </LegalUnorderedList>
      </LegalSection>

      <LegalSection title="6. Betroffenenrechte (Ihre Rechte nach DSGVO)">
        <LegalParagraph>
          Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie
          betreffenden personenbezogenen Daten:
        </LegalParagraph>
        <LegalUnorderedList>
          <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
          <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
          <li>
            Recht auf Löschung („Recht auf Vergessenwerden“) (Art. 17 DSGVO)
          </li>
          <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruchsrecht gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </LegalUnorderedList>
        <LegalParagraph>
          Zur Erfassung, Nachverfolgung und fristgerechten Umsetzung von
          Betroffenenrechten wird intern ein definiertes Revisions-Register
          (DSR-Log) eingesetzt. Sie haben zudem das Recht, sich bei einer
          Datenschutz-Aufsichtsbehörde zu beschweren. Anfragen richten Sie bitte
          an{" "}
          <a
            href={legalMailtoHref()}
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            {SITE_LEGAL.email}
          </a>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. Datensicherheit & Technischer Zugriff">
        <LegalUnorderedList>
          <li>
            Wir nutzen innerhalb des Web-App-Besuchs SSL/TLS-Verbindungen in
            Verbindung mit der jeweils höchsten Verschlüsselungsstufe.
          </li>
          <li>
            Entwickler haben im regulären Betrieb keinen Zugriff auf Kunden-PDFs
            oder vertrauliche Unternehmensdaten; Entwicklung und
            Qualitätssicherung erfolgen vollständig isoliert mit synthetischen
            Testdaten.
          </li>
          <li>
            Administrative Zugriffe auf produktive Speicher- und
            Datenbankressourcen unterliegen dem Least-Privilege-Prinzip,
            erfordern Multi-Faktor-Authentifizierung (MFA) und werden in
            unveränderbaren Plattform-Audit-Logs erfasst.
          </li>
        </LegalUnorderedList>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
