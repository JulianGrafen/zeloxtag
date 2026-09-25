import { Image, Text, View } from "@react-pdf/renderer";

import type { ExposePdfData, ExposePdfImage } from "@/lib/vehicles/expose-pdf/types";

import { exposePdfStyles as styles } from "./expose-pdf-styles";

export function ExposePdfPageFooter({ data }: { data: ExposePdfData }) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        <Text style={styles.footerBrand}>ZeloxTag</Text>
        <Text style={styles.footerUrl}>{data.publicProfileUrl}</Text>
        <Text style={styles.footerMeta}>
          Erstellt am {data.generatedAtLabel}
        </Text>
      </View>
      <View style={styles.footerCenter}>
        <Image src={data.qrCodeDataUri} style={styles.footerQr} />
        <Text style={styles.footerQrLabel}>Digital Twin scannen</Text>
      </View>
      <View style={styles.footerRight}>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Seite ${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </View>
  );
}

export function ExposePdfInnerHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.innerHeader}>
      <Text style={styles.innerHeaderTitle}>{title}</Text>
      <Text style={styles.innerHeaderSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function ExposePdfTrustBadge({ documentCount }: { documentCount: number }) {
  const label =
    documentCount === 1 ? "1 Dokument" : `${documentCount} Dokumente`;
  return (
    <View style={styles.trustBadge} wrap={false}>
      <Text style={styles.trustBadgeText}>
        Verifiziertes ZeloxTag Fahrzeugdossier · {label} fälschungssicher
        erfasst
      </Text>
    </View>
  );
}

export function ExposePdfHeroImage({
  image,
  emptyLabel = "Kein Fahrzeugfoto hinterlegt",
}: {
  image: ExposePdfImage | null;
  emptyLabel?: string;
}) {
  return (
    <View style={styles.heroShowcase} wrap={false}>
      <View style={styles.heroShowcaseMat}>
        <View style={styles.heroShowcaseInner}>
          {image ? (
            <Image src={image.dataUri} style={styles.heroShowcaseImage} />
          ) : (
            <Text style={styles.heroPlaceholder}>{emptyLabel}</Text>
          )}
        </View>
      </View>
      {image ? (
        <Text style={styles.heroCaption}>Fahrzeugabbildung · Digital Twin</Text>
      ) : null}
    </View>
  );
}

export function ExposePdfGalleryTile({ photo }: { photo: ExposePdfImage }) {
  return (
    <View style={styles.galleryTile} wrap={false}>
      <View style={styles.photoMat}>
        <View style={styles.photoMatInner}>
          <Image src={photo.dataUri} style={styles.galleryTileImage} />
        </View>
      </View>
    </View>
  );
}

export function ExposePdfChipRow({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <View style={styles.chipRow} wrap={false}>
      {labels.map((label) => (
        <View key={label} style={styles.chip}>
          <Text style={styles.chipText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}
