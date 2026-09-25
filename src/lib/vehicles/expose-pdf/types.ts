/** Serializable payload passed to @react-pdf/renderer (data URIs for images). */

export type ExposePdfImage = {
  id: string;
  dataUri: string;
  alt: string;
};

export type ExposeMaintenanceRow = {
  date: string;
  mileageKm: number;
  /** False for manual / service entries without odometer. */
  mileageKnown: boolean;
  workshop: string;
  service: string;
  tuevStatus: string;
  amount: number | null;
};

export type ExposeModificationRow = {
  category: string;
  partName: string;
  manufacturer: string;
  kbaNumber: string;
  approvalStatus: string;
  installationDate: string;
  amount: number | null;
};

export type ExposePdfData = {
  generatedAt: string;
  generatedAtLabel: string;
  documentCount: number;
  buildPersonalityLabels: string[];
  vehicleTitle: string;
  vehicleSubtitle: string;
  publicProfileUrl: string;
  qrCodeDataUri: string;
  hideFinancials: boolean;
  sellerContact: string;
  metrics: {
    powerLabel: string;
    mileageLabel: string;
    yearLabel: string;
    /** Sum of documented modifications (Umbauten). */
    modificationValueLabel: string;
    /** Sum of maintenance / service rows. */
    maintenanceValueLabel: string;
    /** Modifications + maintenance where amounts exist. */
    documentedTotalLabel: string;
  };
  specs: {
    vin: string;
    hsnTsn: string;
    engine: string;
    gearbox: string;
    fuel: string;
    color: string;
    previousOwners: string;
    drivetrain: string;
    bodyType: string;
    torqueLabel: string;
  };
  latestTuevStatus: string;
  maintenanceRows: ExposeMaintenanceRow[];
  modifications: ExposeModificationRow[];
  modificationTotal: number | null;
  maintenanceTotal: number | null;
  documentedTotal: number | null;
  heroImage: ExposePdfImage | null;
  galleryImages: ExposePdfImage[];
  dynoChartImage: ExposePdfImage | null;
  dynoChartPdfNote: string | null;
};
