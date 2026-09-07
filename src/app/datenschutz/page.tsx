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
        <LegalParagraph>
          Unsere Web-App wird bei externen Cloud-Infrastruktur-Diensten (Vercel
          Inc. sowie Supabase Inc.) gehostet. Beim Aufruf von{" "}
          {SITE_LEGAL.appHost} werden durch den Browser automatisch Informationen
          an den Server übermittelt (z.&nbsp;B. IP-Adresse, Datum und Uhrzeit,
          Name der abgerufenen Datei, Browser-Typ).
        </LegalParagraph>
        <LegalUnorderedList>
          <li>
            Die Datenspeicherung und Kernverarbeitung erfolgt physisch
            ausschließlich in der EU bzw. im EWR (Frankfurt am Main).
          </li>
          <li>
            Durch das globale Edge-Netzwerk (Anycast CDN) von Vercel kann
            initialer Traffic zur Gewährleistung der Erreichbarkeit temporär über
            Serverknoten außerhalb des EWR geleitet werden.
          </li>
          <li>
            Sowohl Vercel Inc. als auch Supabase Inc. sind nach dem EU-US Data
            Privacy Framework (DPF) zertifiziert. Ein potenzieller Datentransfer
            in die USA ist hierdurch rechtlich vollumfänglich abgesichert.
            Ergänzend wurden Auftragsverarbeitungsverträge (AVV) inkl.
            EU-Standardvertragsklauseln (SCCs) geschlossen.
          </li>
          <li>
            Vercel nutzt IP-Adressen im Rahmen berechtigter Interessen (Art. 6
            Abs. 1 lit. f DSGVO) zur Angriffsabwehr (z.&nbsp;B. DDoS-Schutz) und
            für die integrierte Firewall.
          </li>
          <li>
            Die Speicherdauer der Server- und Access-Logs beträgt im
            Standardbetrieb 24 Stunden (bis maximal 30 Tage bei Nutzung
            erweiterter Observability-Funktionen).
          </li>
        </LegalUnorderedList>

        <LegalParagraph>
          <strong>b) Bei Registrierung und Nutzung des Benutzerkontos</strong>
        </LegalParagraph>
        <LegalParagraph>
          Zur Nutzung von ZeloxTag erheben wir Ihre E-Mail-Adresse, das Passwort
          (verschlüsselt gespeichert), eingegebene Fahrzeugdaten (wie die
          Fahrgestellnummer/VIN) sowie hochgeladene Dokumente (z.&nbsp;B.
          Rechnungen, ABEs). Die Rechtsgrundlage hierfür ist Art. 6 Abs. 1 lit. b
          DSGVO (Vertragserfüllung).
        </LegalParagraph>
        <LegalParagraph>
          Als zentrale Datenbankarchitektur setzen wir ein relationales
          PostgreSQL-Datenbanksystem (v15+) via Supabase ein, welches im
          Rechenzentrum Frankfurt am Main gehostet wird. Sämtliche
          Datenbankinhalte und verknüpften Speicherobjekte werden durchgehend
          nach aktuellen Industriestandards verschlüsselt.
        </LegalParagraph>

        <LegalParagraph>
          <strong>c) Cookies &amp; Consent-Management</strong>
        </LegalParagraph>
        <LegalParagraph>
          Für das Einholen und Verwalten von Nutzereinwilligungen setzen wir das
          Consent-Management-Tool „Cookiebot“ (Usercentrics A/S, Havnegade 39,
          1058 Kopenhagen, Dänemark) ein.
        </LegalParagraph>
        <LegalUnorderedList>
          <li>
            Cookiebot verarbeitet Ihre IP-Adresse und den Zustimmungsstatus, um
            Ihre Präferenzen rechtssicher zu dokumentieren (Rechtsgrundlage:
            Art. 6 Abs. 1 lit. c DSGVO).
          </li>
          <li>
            Vor der ausdrücklichen Einwilligung des Nutzers werden auf unserer
            Website ausschließlich technisch zwingend erforderliche Cookies
            gesetzt (dies schließt notwendige Third-Party-Sicherheits-Cookies
            unseres Zahlungsdienstleisters Stripe zur Betrugsprävention ein).
          </li>
          <li>
            Aktuell setzen wir keine Tracking-Tools wie Google Analytics ein.
          </li>
        </LegalUnorderedList>
      </LegalSection>

      <LegalSection title="3. Spezifische Funktionen, Dokumentenspeicherung & Dienstleister">
        <LegalParagraph>
          <strong>a) Speicherung von Dokumenten (PDFs)</strong>
        </LegalParagraph>
        <LegalParagraph>
          Die Speicherung hochgeladener Dokumente erfolgt in Supabase Storage auf
          Basis einer AWS S3-Infrastruktur mit ausschließlichem Speicherort in
          Frankfurt am Main.
        </LegalParagraph>
        <LegalUnorderedList>
          <li>
            Alle gespeicherten PDFs werden im Ruhezustand (Data at Rest)
            standardmäßig mittels AES-256 (Server-Side Encryption) verschlüsselt.
            Jede Datenübertragung (Upload und Download) erfolgt zwingend über
            HTTPS und ist via TLS 1.2 bzw. TLS 1.3 transportverschlüsselt.
          </li>
          <li>
            Die Dokumente werden in nicht-öffentlichen Buckets (Private Storage)
            gespeichert. Zugriffe werden mandantenspezifisch isoliert,
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
          <strong>
            b) Automatisierte Belegerfassung &amp; KI-Textextraktion (Azure AI
            Document Intelligence &amp; Azure AI Foundry)
          </strong>
        </LegalParagraph>
        <LegalParagraph>
          <strong>Funktionsweise &amp; Architektur:</strong> Für die digitale
          Erfassung und Auswertung von Fahrzeugdokumenten (z.&nbsp;B. Rechnungen,
          ABEs, Gutachten, TÜV-Berichte) setzen wir eine zweistufige
          Analyse-Pipeline ein:
        </LegalParagraph>
        <LegalUnorderedList>
          <li>
            <strong>Optische Zeichen- und Layouterkennung (OCR):</strong> Über
            Azure AI Document Intelligence werden die hochgeladenen Bild- und
            PDF-Dateien analysiert, um Textinhalte, Belegstrukturen und
            Tabellendaten präzise zu erfassen.
          </li>
          <li>
            <strong>Semantische Extraktion &amp; Modell-Routing:</strong> Über
            Microsoft Azure AI Foundry (Azure OpenAI Service) verarbeiten
            Sprachmodelle (z.&nbsp;B. GPT-Modelle) die extrahierten Rohtexte, um
            Bauteile, KBA-Nummern, Datumsangaben, Kilometerstände und Kosten zu
            strukturieren. Zur Gewährleistung von Hochverfügbarkeit und
            Lastverteilung greift das System bei Bedarf auf interne
            Fallback-Modelle innerhalb der Azure-Infrastruktur zurück.
          </li>
        </LegalUnorderedList>
        <LegalParagraph>
          <strong>Dienstleister &amp; Serverstandort:</strong> Vertragspartner ist
          die Microsoft Ireland Operations Limited (One Microsoft Place, South
          County Business Park, Leopardstown, Dublin 18, Irland). Die
          Verarbeitung sämtlicher Dokumente und die Modellausführung erfolgen auf
          Cloud-Ressourcen innerhalb der Europäischen Union, primär im
          Rechenzentrum Frankfurt am Main (Azure Region Germany West Central).
        </LegalParagraph>
        <LegalParagraph>
          <strong>Umfang der Datenverarbeitung:</strong> Übertragen werden die
          vom Nutzer aktiv hochgeladenen Belege (PDF-, JPEG- oder PNG-Dateien)
          sowie die darin enthaltenen Text- und Metadaten. Dies umfasst neben
          rein fahrzeugbezogenen Sachdaten (Fahrgestellnummer/FIN, amtliches
          Kennzeichen, Bauteilbezeichnungen) auch die auf den Rechnungen
          abgedruckten personenbezogenen Daten (z.&nbsp;B. Name und Anschrift des
          Rechnungsempfängers bzw. Ausstellers).
        </LegalParagraph>
        <LegalParagraph>
          <strong>Zweck &amp; Rechtsgrundlage:</strong> Eine Vorab-Anonymisierung
          der Dokumente erfolgt bewusst nicht, da die Erfassung der Halter- und
          Fahrzeughistorie sowie die eindeutige Zuordnung der Belege integraler
          Bestandteil der digitalen Fahrzeugakte ist. Rechtsgrundlage für diese
          Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des
          Nutzungsvertrags).
        </LegalParagraph>
        <LegalParagraph>
          <strong>Ausschluss von Modell-Training:</strong> Die übermittelten
          Dokumente, Extrakte und Systemanweisungen (Prompts) werden von
          Microsoft, OpenAI oder Dritten zu keinem Zeitpunkt zum Trainieren oder
          Verbessern von KI-Modellen verwendet.
        </LegalParagraph>
        <LegalParagraph>
          <strong>Speicherdauer &amp; Abuse Monitoring:</strong> Die Analyse
          erfolgt zustandslos (stateless). Zur Erkennung von
          Sicherheitsvorfällen und zum Schutz vor Missbrauch (Abuse Monitoring)
          behält sich Microsoft standardmäßig eine temporäre, zugriffsgeschützte
          Speicherung der verarbeiteten Daten für maximal 30 Tage vor. Nach Ablauf
          dieser Frist bzw. mit Abschluss der Prüfung werden die temporären Daten
          bei Microsoft verworfen.
        </LegalParagraph>
        <LegalParagraph>
          <strong>Drittlandübermittlung:</strong> Ein potenzieller Zugriff oder
          Transfer durch die US-amerikanische Konzernmutter (Microsoft
          Corporation) ist durch die Zertifizierung von Microsoft unter dem
          EU-US Data Privacy Framework (DPF) sowie den Abschluss des Microsoft
          Data Protection Addendum (DPA) inklusive EU-Standardvertragsklauseln
          (SCCs) rechtlich abgesichert.
        </LegalParagraph>

        <LegalParagraph>
          <strong>c) Zahlungsabwicklung via Stripe</strong>
        </LegalParagraph>
        <LegalParagraph>
          Für die Abwicklung kostenpflichtiger Abonnements nutzen wir den
          Zahlungsdienstleister Stripe Payments Europe, Ltd., 1 Grand Canal
          Street Lower, Grand Canal Dock, Dublin, Irland. Wir speichern selbst
          keine vollständigen Kreditkartendaten. Stripe verarbeitet Ihre
          Zahlungs- und Stammdaten zur Abwicklung der Abrechnung. Ein
          potenzieller Datentransfer in die USA ist durch das EU-US Data Privacy
          Framework (DPF) abgesichert. Datenschutzerklärung von Stripe:{" "}
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
          Für den Versand von transaktionalen E-Mails (z.&nbsp;B.
          E-Mail-Bestätigung, Passwort-Reset) nutzen wir den Dienst Resend Inc.
          Das Tracking von Öffnungs- und Klickraten (Open-/Click-Tracking) ist
          für diese essenziellen System-Mails vollständig deaktiviert. Der
          Datentransfer in die USA wird durch das EU-US Data Privacy Framework
          (DPF) sowie Standardvertragsklauseln (SCCs) abgesichert.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
          einer zuverlässigen Zustellung von System-E-Mails).
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
          Wenn du dein Konto in den Einstellungen freiwillig löschst, durchläuft
          es einen automatisierten Lebenszyklus zur Gewährleistung der
          DSGVO-Vorgaben. Die Kündigung eines Pro-Abos führt hingegen nur zum
          Wechsel in den kostenlosen Tarif — dein Konto bleibt bestehen.
        </LegalParagraph>
        <LegalUnorderedList>
          <li>
            <strong>Grace Period:</strong> Nach der Lösch-Anfrage wird das Konto
            für 30 Tage in einen &quot;Gesperrt / Read-Only&quot;-Status
            versetzt. Du kannst deine Akte als ZIP-Archiv herunterladen oder die
            Löschung widerrufen.
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
          (DSR-Log) eingesetzt.
        </LegalParagraph>
        <LegalParagraph>
          Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde
          zu beschweren. Die für unseren Unternehmenssitz konkret zuständige
          Behörde ist die Landesbeauftragte für Datenschutz und
          Informationsfreiheit Nordrhein-Westfalen (LDI NRW). Anfragen zur
          Ausübung Ihrer Rechte richten Sie bitte an{" "}
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
            Administrative Zugriffe unsererseits auf produktive Speicher- und
            Datenbankressourcen unterliegen dem Least-Privilege-Prinzip,
            erfordern zwingend eine Multi-Faktor-Authentifizierung (MFA) für
            alle eingesetzten Kernsysteme (Vercel, Supabase, Azure, Stripe) und
            werden in unveränderbaren Plattform-Audit-Logs erfasst.
          </li>
        </LegalUnorderedList>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
