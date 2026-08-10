import {
  Document,
  Image,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";

import { formatCurrencyEur, formatMileageKm } from "@/lib/vehicles/expose-pdf/formatters";
import type { ExposePdfData } from "@/lib/vehicles/expose-pdf/types";

import { exposePdfStyles as styles } from "./expose-pdf-styles";

type ExposePdfDocumentProps = {
  data: ExposePdfData;
};

function PageFooter({ data }: { data: ExposePdfData }) {
  return (
    <View style={styles.footer} fixed>
      <View>
        <Text style={styles.footerBrand}>ZeloxTag</Text>
        <Text style={styles.footerUrl}>{data.publicProfileUrl}</Text>
      </View>
      <Image src={data.qrCodeDataUri} style={styles.footerQr} />
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `Seite ${pageNumber} von ${totalPages}`
        }
      />
    </View>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.headerBar}>
      <Text style={styles.headerTitle}>{title}</Text>
      <Text style={styles.headerSubtitle}>{subtitle}</Text>
    </View>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox} wrap={false}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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

function CoverPage({ data }: { data: ExposePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="Fahrzeug-Exposé" subtitle="ZeloxTag · Digital Vehicle Twin" />
      <Text style={styles.coverTitle}>{data.vehicleTitle}</Text>
      <Text style={styles.coverSubtitle}>{data.vehicleSubtitle}</Text>

      {data.heroImage ? (
        <Image src={data.heroImage.dataUri} style={styles.heroImage} />
      ) : (
        <View style={[styles.heroImage, { justifyContent: "center", alignItems: "center" }]}>
          <Text style={styles.muted}>Kein Fahrzeugfoto hinterlegt</Text>
        </View>
      )}

      <View style={styles.metricsGrid} wrap={false}>
        <MetricBox label="Leistung" value={data.metrics.powerLabel} />
        <MetricBox label="Kilometerstand" value={data.metrics.mileageLabel} />
        <MetricBox label="Baujahr" value={data.metrics.yearLabel} />
        <MetricBox
          label={data.hideFinancials ? "Preis / Wert" : "Investition Umbauten"}
          value={data.metrics.valueLabel}
        />
      </View>

      <View style={styles.sellerBadge} wrap={false}>
        <Text style={styles.sellerBadgeLabel}>Ansprechpartner</Text>
        <Text style={styles.sellerBadgeValue}>{data.sellerContact}</Text>
      </View>

      <PageFooter data={data} />
    </Page>
  );
}

function SpecsPage({ data }: { data: ExposePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader
        title="Technische Daten & Historie"
        subtitle={`${data.vehicleTitle} · TÜV: ${data.latestTuevStatus}`}
      />

      <Text style={styles.sectionTitle}>Technisches Datenblatt</Text>
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

      <Text style={styles.sectionTitle}>Wartung & Servicehistorie</Text>
      {data.maintenanceRows.length === 0 ? (
        <Text style={styles.emptyState}>
          Noch keine Service-Einträge mit Kilometerstand hinterlegt.
        </Text>
      ) : (
        <View style={styles.table} wrap={false}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Datum</Text>
            <Text style={[styles.tableHeaderCell, { width: "14%" }]}>KM</Text>
            <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Werkstatt</Text>
            <Text style={[styles.tableHeaderCell, { width: "24%" }]}>Service</Text>
            <Text style={[styles.tableHeaderCell, { width: "26%" }]}>TÜV</Text>
          </View>
          {data.maintenanceRows.map((row, index) => (
            <View key={`${row.date}-${index}`} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "14%" }]}>{row.date}</Text>
              <Text style={[styles.tableCell, { width: "14%" }]}>
                {formatMileageKm(row.mileageKm)}
              </Text>
              <Text style={[styles.tableCell, { width: "22%" }]}>{row.workshop}</Text>
              <Text style={[styles.tableCell, { width: "24%" }]}>{row.service}</Text>
              <Text style={[styles.tableCell, { width: "26%" }]}>{row.tuevStatus}</Text>
            </View>
          ))}
        </View>
      )}

      <PageFooter data={data} />
    </Page>
  );
}

function ModificationsPage({ data }: { data: ExposePdfData }) {
  const showAmounts = !data.hideFinancials;

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader
        title="Umbauten & Tuning"
        subtitle={
          data.hideFinancials
            ? "Finanzielle Angaben ausgeblendet (Privatsphäre)"
            : "Investitionen transparent dokumentiert"
        }
      />

      {data.modifications.length === 0 ? (
        <Text style={styles.emptyState}>
          Keine Umbauten oder Tuning-Teile hinterlegt.
        </Text>
      ) : (
        <View style={styles.table} wrap={false}>
          <View style={styles.tableHeader}>
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
          {data.modifications.map((row, index) => (
            <View key={`${row.partName}-${index}`} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "14%" }]}>{row.category}</Text>
              <Text style={[styles.tableCell, { width: "24%" }]}>{row.partName}</Text>
              <Text style={[styles.tableCell, { width: "16%" }]}>{row.manufacturer}</Text>
              <Text style={[styles.tableCell, { width: "14%" }]}>{row.kbaNumber}</Text>
              <Text style={[styles.tableCell, { width: "16%" }]}>{row.approvalStatus}</Text>
              <Text style={[styles.tableCell, { width: "10%" }]}>{row.installationDate}</Text>
              {showAmounts ? (
                <Text style={[styles.tableCell, { width: "10%" }]}>
                  {formatCurrencyEur(row.amount)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {!data.hideFinancials && data.modificationTotal != null ? (
        <View style={styles.totalRow} wrap={false}>
          <Text style={styles.totalLabel}>Gesamtinvestition Umbauten:</Text>
          <Text style={styles.totalLabel}>
            {formatCurrencyEur(data.modificationTotal)}
          </Text>
        </View>
      ) : null}

      <PageFooter data={data} />
    </Page>
  );
}

function GalleryPage({ data }: { data: ExposePdfData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="Galerie & Leistung" subtitle={data.vehicleTitle} />

      <Text style={styles.sectionTitle}>Detailaufnahmen</Text>
      {data.galleryImages.length === 0 ? (
        <Text style={styles.emptyState}>
          Keine Umbau-Fotos hinterlegt — Fahrzeugprofil ergänzen für eine vollständige Galerie.
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
        <Image src={data.dynoChartImage.dataUri} style={styles.dynoImage} />
      ) : (
        <Text style={styles.emptyState}>
          {data.dynoChartPdfNote ??
            "Kein Leistungsdiagramm hinterlegt — Dyno-Chart im ZeloxTag-Profil uploaden."}
        </Text>
      )}

      <PageFooter data={data} />
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
      <ModificationsPage data={data} />
      <GalleryPage data={data} />
    </Document>
  );
}
