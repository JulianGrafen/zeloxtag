import {
  Document,
  Image,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  formatCurrencyEur,
  formatExposeCurrencyCell,
  formatTimelineMileageKm,
} from "@/lib/vehicles/expose-pdf/formatters";
import type { ExposePdfData } from "@/lib/vehicles/expose-pdf/types";

import {
  ExposePdfChipRow,
  ExposePdfInnerHeader,
  ExposePdfPageFooter,
  ExposePdfTrustBadge,
} from "./expose-pdf-parts";
import { exposePdfStyles as styles } from "./expose-pdf-styles";

type ExposePdfDocumentProps = {
  data: ExposePdfData;
};

function MetricBoxPrimary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBoxPrimary} wrap={false}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValuePrimary}>{value}</Text>
    </View>
  );
}

function MetricBoxSecondary({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.metricBoxSecondary} wrap={false}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValueSecondary}>{value}</Text>
    </View>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specRow} wrap={false}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

function buildCoverFactsLine(data: ExposePdfData): string {
  return [data.metrics.yearLabel, data.metrics.mileageLabel, data.metrics.powerLabel]
    .filter((part) => part && part !== "—")
    .join(" · ");
}

function CoverPage({ data }: { data: ExposePdfData }) {
  const factsLine = buildCoverFactsLine(data);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.coverBrandBar}>
        <View>
          <Text style={styles.coverBrandTitle}>ZeloxTag</Text>
          <Text style={styles.coverBrandTagline}>Digital Vehicle Twin</Text>
        </View>
        <Text style={styles.coverBrandTagline}>Verkaufsexposé</Text>
      </View>

      <Text style={styles.eyebrow}>Verkaufsexposé</Text>
      <Text style={styles.coverTitle}>{data.vehicleTitle}</Text>
      {factsLine ? (
        <Text style={styles.coverFactsLine}>{factsLine}</Text>
      ) : null}
      <Text style={styles.coverSubtitle}>{data.vehicleSubtitle}</Text>

      <View style={styles.heroFrame}>
        {data.heroImage ? (
          <Image src={data.heroImage.dataUri} style={styles.heroImage} />
        ) : (
          <Text style={styles.muted}>Kein Fahrzeugfoto hinterlegt</Text>
        )}
      </View>

      <ExposePdfTrustBadge documentCount={data.documentCount} />
      <ExposePdfChipRow labels={data.buildPersonalityLabels} />

      <View style={styles.metricsPrimaryRow} wrap={false}>
        <MetricBoxPrimary label="Leistung" value={data.metrics.powerLabel} />
        <MetricBoxPrimary label="Kilometerstand" value={data.metrics.mileageLabel} />
        <MetricBoxPrimary label="Baujahr" value={data.metrics.yearLabel} />
      </View>

      {!data.hideFinancials ? (
        <View style={styles.metricsSecondaryRow} wrap={false}>
          <MetricBoxSecondary
            label="Gesamtkosten dokumentiert"
            value={data.metrics.documentedTotalLabel}
          />
          <MetricBoxSecondary
            label="Wartung & Service"
            value={data.metrics.maintenanceValueLabel}
          />
          <MetricBoxSecondary
            label="Investition Umbauten"
            value={data.metrics.modificationValueLabel}
          />
        </View>
      ) : null}

      <View style={styles.sellerCard} wrap={false}>
        <Text style={styles.sellerLabel}>Ansprechpartner</Text>
        <Text style={styles.sellerValue}>{data.sellerContact}</Text>
      </View>

      <ExposePdfPageFooter data={data} />
    </Page>
  );
}

function SpecsPage({ data }: { data: ExposePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <ExposePdfInnerHeader
        title="Technische Daten"
        subtitle={data.vehicleTitle}
      />
      <Text style={styles.sectionTitle}>Technisches Datenblatt</Text>
      <Text style={styles.tuevHighlight}>TÜV: {data.latestTuevStatus}</Text>

      <View style={styles.specGrid} wrap={false}>
        <SpecRow label="FIN / VIN" value={data.specs.vin} />
        <SpecRow label="HSN / TSN" value={data.specs.hsnTsn} />
        <SpecRow label="Motor" value={data.specs.engine} />
        <SpecRow label="Getriebe" value={data.specs.gearbox} />
        <SpecRow label="Kraftstoff" value={data.specs.fuel} />
        <SpecRow label="Farbe" value={data.specs.color} />
        <SpecRow label="Antrieb" value={data.specs.drivetrain} />
        <SpecRow label="Karosserie" value={data.specs.bodyType} />
        <SpecRow label="Drehmoment" value={data.specs.torqueLabel} />
        <SpecRow label="Vorbesitzer" value={data.specs.previousOwners} />
      </View>

      <ExposePdfPageFooter data={data} />
    </Page>
  );
}

function MaintenanceTable({
  rows,
  hideFinancials,
}: {
  rows: ExposePdfData["maintenanceRows"];
  hideFinancials: boolean;
}) {
  const showAmounts = !hideFinancials;
  const col = showAmounts
    ? { date: "11%", km: "11%", workshop: "18%", service: "20%", tuev: "20%", cost: "12%" }
    : { date: "14%", km: "14%", workshop: "22%", service: "24%", tuev: "26%", cost: "0%" };

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader} minPresenceAhead={40}>
        <Text style={[styles.tableHeaderCell, { width: col.date }]}>Datum</Text>
        <Text style={[styles.tableHeaderCell, { width: col.km }]}>KM</Text>
        <Text style={[styles.tableHeaderCell, { width: col.workshop }]}>Werkstatt</Text>
        <Text style={[styles.tableHeaderCell, { width: col.service }]}>Service</Text>
        <Text style={[styles.tableHeaderCell, { width: col.tuev }]}>TÜV</Text>
        {showAmounts ? (
          <Text style={[styles.tableHeaderCell, { width: col.cost }]}>Kosten</Text>
        ) : null}
      </View>
      {rows.map((row, index) => (
        <View
          key={`${row.date}-${row.service}-${index}`}
          style={[
            styles.tableRow,
            ...(index % 2 === 1 ? [styles.tableRowAlt] : []),
          ]}
        >
          <Text style={[styles.tableCell, { width: col.date }]}>{row.date}</Text>
          <Text style={[styles.tableCell, { width: col.km }]}>
            {formatTimelineMileageKm(row.mileageKm, row.mileageKnown)}
          </Text>
          <Text style={[styles.tableCell, styles.tableCellWrap, { width: col.workshop }]}>
            {row.workshop}
          </Text>
          <Text style={[styles.tableCell, styles.tableCellWrap, { width: col.service }]}>
            {row.service}
          </Text>
          <Text style={[styles.tableCell, styles.tableCellWrap, { width: col.tuev }]}>
            {row.tuevStatus}
          </Text>
          {showAmounts ? (
            <Text style={[styles.tableCell, { width: col.cost }]}>
              {formatExposeCurrencyCell(row.amount, hideFinancials)}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const MAINTENANCE_ROWS_PER_PAGE = 16;

function MaintenanceHistoryPages({ data }: { data: ExposePdfData }) {
  const rows = data.maintenanceRows;

  if (rows.length === 0) {
    return (
      <Page size="A4" style={styles.page}>
        <ExposePdfInnerHeader
          title="Wartung & Servicehistorie"
          subtitle={data.vehicleTitle}
        />
        <Text style={styles.emptyState}>
          Noch keine Wartungs- oder Service-Einträge hinterlegt.
        </Text>
        <ExposePdfPageFooter data={data} />
      </Page>
    );
  }

  const pageCount = Math.ceil(rows.length / MAINTENANCE_ROWS_PER_PAGE);
  return Array.from({ length: pageCount }, (_, pageIndex) => {
    const slice = rows.slice(
      pageIndex * MAINTENANCE_ROWS_PER_PAGE,
      (pageIndex + 1) * MAINTENANCE_ROWS_PER_PAGE,
    );
    const subtitle =
      pageIndex === 0
        ? data.vehicleTitle
        : `${data.vehicleTitle} · Fortsetzung`;

    return (
      <Page key={`maintenance-${pageIndex}`} size="A4" style={styles.page}>
        <ExposePdfInnerHeader
          title="Wartung & Servicehistorie"
          subtitle={subtitle}
        />
        <MaintenanceTable rows={slice} hideFinancials={data.hideFinancials} />
        {!data.hideFinancials &&
        data.maintenanceTotal != null &&
        pageIndex === pageCount - 1 ? (
          <View style={styles.totalCard} wrap={false}>
            <Text style={styles.totalLabel}>Summe Wartung & Service</Text>
            <Text style={styles.totalValue}>
              {formatCurrencyEur(data.maintenanceTotal)}
            </Text>
          </View>
        ) : null}
        <ExposePdfPageFooter data={data} />
      </Page>
    );
  });
}

function ModificationsTable({
  rows,
  hideFinancials,
}: {
  rows: ExposePdfData["modifications"];
  hideFinancials: boolean;
}) {
  const showAmounts = !hideFinancials;

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader} wrap={false}>
        <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Kategorie</Text>
        <Text style={[styles.tableHeaderCell, { width: "24%" }]}>Teil</Text>
        <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Hersteller</Text>
        <Text style={[styles.tableHeaderCell, { width: "14%" }]}>KBA</Text>
        <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Status</Text>
        <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Datum</Text>
        {showAmounts ? (
          <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Preis</Text>
        ) : null}
      </View>
      {rows.map((row, index) => (
        <View
          key={`${row.partName}-${index}`}
          style={[
            styles.tableRow,
            ...(index % 2 === 1 ? [styles.tableRowAlt] : []),
          ]}
        >
          <Text style={[styles.tableCell, { width: "14%" }]}>{row.category}</Text>
          <Text style={[styles.tableCell, { width: "24%" }]}>{row.partName}</Text>
          <Text style={[styles.tableCell, { width: "16%" }]}>{row.manufacturer}</Text>
          <Text style={[styles.tableCell, { width: "14%" }]}>{row.kbaNumber}</Text>
          <Text style={[styles.tableCell, { width: "16%" }]}>{row.approvalStatus}</Text>
          <Text style={[styles.tableCell, { width: "10%" }]}>{row.installationDate}</Text>
          {showAmounts ? (
            <Text style={[styles.tableCell, { width: "10%" }]}>
              {formatExposeCurrencyCell(row.amount, hideFinancials)}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const MOD_ROWS_PER_PAGE = 14;

function ModificationsPages({ data }: { data: ExposePdfData }) {
  const rows = data.modifications;
  const privacySubtitle = data.hideFinancials
    ? "Finanzielle Angaben ausgeblendet (Privatsphäre)"
    : "Investitionen transparent dokumentiert";

  if (rows.length === 0) {
    return (
      <Page size="A4" style={styles.page}>
        <ExposePdfInnerHeader
          title="Umbauten & Tuning"
          subtitle={privacySubtitle}
        />
        <Text style={styles.emptyState}>
          Keine Umbauten oder Tuning-Teile hinterlegt.
        </Text>
        <ExposePdfPageFooter data={data} />
      </Page>
    );
  }

  const pageCount = Math.ceil(rows.length / MOD_ROWS_PER_PAGE);
  return Array.from({ length: pageCount }, (_, pageIndex) => {
    const slice = rows.slice(
      pageIndex * MOD_ROWS_PER_PAGE,
      (pageIndex + 1) * MOD_ROWS_PER_PAGE,
    );
    const subtitle =
      pageIndex === 0
        ? privacySubtitle
        : `${data.vehicleTitle} · Fortsetzung`;

    return (
      <Page key={`mods-${pageIndex}`} size="A4" style={styles.page}>
        <ExposePdfInnerHeader title="Umbauten & Tuning" subtitle={subtitle} />
        <ModificationsTable rows={slice} hideFinancials={data.hideFinancials} />
        {!data.hideFinancials &&
        data.modificationTotal != null &&
        pageIndex === pageCount - 1 ? (
          <View style={styles.totalCard} wrap={false}>
            <Text style={styles.totalLabel}>Gesamtinvestition Umbauten</Text>
            <Text style={styles.totalValue}>
              {formatCurrencyEur(data.modificationTotal)}
            </Text>
          </View>
        ) : null}
        <ExposePdfPageFooter data={data} />
      </Page>
    );
  });
}

function GalleryPage({ data }: { data: ExposePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <ExposePdfInnerHeader
        title="Galerie & Leistung"
        subtitle={data.vehicleTitle}
      />

      <Text style={styles.sectionTitle}>Detailaufnahmen</Text>
      {data.galleryImages.length === 0 ? (
        <Text style={styles.emptyState}>
          Keine Umbau-Fotos hinterlegt — Fahrzeugprofil ergänzen für eine
          vollständige Galerie.
        </Text>
      ) : (
        <View style={styles.galleryGrid} wrap={false}>
          {data.galleryImages.map((photo) => (
            <Image
              key={photo.id}
              src={photo.dataUri}
              style={styles.galleryItem}
            />
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Leistungsdiagramm</Text>
      {data.dynoChartImage ? (
        <View style={styles.dynoCard}>
          <Text style={styles.dynoCaption}>
            Leistung und Drehmoment — dokumentiertes Dyno-Chart
          </Text>
          <Image src={data.dynoChartImage.dataUri} style={styles.dynoImage} />
        </View>
      ) : (
        <Text style={styles.emptyState}>
          {data.dynoChartPdfNote ??
            "Kein Leistungsdiagramm hinterlegt — Dyno-Chart im ZeloxTag-Profil uploaden."}
        </Text>
      )}

      <ExposePdfPageFooter data={data} />
    </Page>
  );
}

export function ExposePdfDocument({ data }: ExposePdfDocumentProps) {
  return (
    <Document
      title={`Exposé — ${data.vehicleTitle}`}
      author="ZeloxTag"
      subject="Fahrzeug-Exposé"
    >
      <CoverPage data={data} />
      <SpecsPage data={data} />
      <MaintenanceHistoryPages data={data} />
      <ModificationsPages data={data} />
      <GalleryPage data={data} />
    </Document>
  );
}
