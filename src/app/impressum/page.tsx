import type { Metadata } from "next";

import {
  LegalDocumentLayout,
  LegalSection,
} from "@/components/legal/legal-document-layout";
import {
  formatLegalAddress,
  legalMailtoHref,
  SITE_LEGAL,
} from "@/lib/legal/site-legal";

export const metadata: Metadata = {
  title: "Impressum · ZeloxTag",
  description: "Impressum und Anbieterkennzeichnung für ZeloxTag.",
};

export default function ImpressumPage() {
  const address = formatLegalAddress();

  return (
    <LegalDocumentLayout
      title="Impressum"
      description="Angaben gemäß § 5 TMG"
    >
      <LegalSection title="Anbieter">
        <p>{SITE_LEGAL.operatorName}</p>
        <p>{SITE_LEGAL.street}</p>
        <p>
          {SITE_LEGAL.postalCode} {SITE_LEGAL.city}
        </p>
        <p>{SITE_LEGAL.country}</p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          E-Mail:{" "}
          <a
            href={legalMailtoHref()}
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            {SITE_LEGAL.email}
          </a>
        </p>
        {SITE_LEGAL.phone ? <p>Telefon: {SITE_LEGAL.phone}</p> : null}
        <p>
          Web:{" "}
          <a
            href={SITE_LEGAL.website}
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            {SITE_LEGAL.appHost}
          </a>
        </p>
      </LegalSection>

      {(SITE_LEGAL.registerCourt && SITE_LEGAL.registerNumber) ||
      SITE_LEGAL.vatId ? (
        <LegalSection title="Registereintrag & Umsatzsteuer">
          {SITE_LEGAL.registerCourt && SITE_LEGAL.registerNumber ? (
            <p>
              Registergericht: {SITE_LEGAL.registerCourt}, Registernummer:{" "}
              {SITE_LEGAL.registerNumber}
            </p>
          ) : null}
          {SITE_LEGAL.vatId ? (
            <p>Umsatzsteuer-Identifikationsnummer: {SITE_LEGAL.vatId}</p>
          ) : null}
        </LegalSection>
      ) : null}

      <LegalSection title="Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV)">
        <p>
          {SITE_LEGAL.contentResponsible}
          <br />
          {address}
        </p>
      </LegalSection>

      <LegalSection title="EU-Streitschlichtung">
        <p>
          Die Europäische Kommission stellt eine Plattform zur
          Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Wir sind nicht verpflichtet und nicht bereit, an
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </LegalSection>

      <LegalSection title="Haftung für Inhalte">
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte
          auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
          §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet,
          übermittelte oder gespeicherte fremde Informationen zu überwachen oder
          nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
          hinweisen.
        </p>
      </LegalSection>

      <LegalSection title="Haftung für Links">
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren
          Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten
          Seiten ist stets der jeweilige Anbieter verantwortlich.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
