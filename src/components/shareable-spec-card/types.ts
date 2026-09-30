import type { ShowcaseQuartettMeta } from "@/components/public-showcase/showcase-spec-rows";
import type { ShowcaseBuildDna } from "@/lib/showcase/build-dna-schema";

export interface VehicleSpecMetric {
  label: string;
  value: number | string;
  unit: string;
  stockValue?: number;
  maxValue: number;
  scaleMin?: number;
  delta?: string;
}

export type ShareCardSpecRow = {
  key: string;
  label: string;
  valueText: string;
  layout: "quartett" | "inline" | "stacked";
  quartett?: ShowcaseQuartettMeta;
};

export interface ShareableBuildData {
  modelName: string;
  imageUrl?: string;
  specRows: ShareCardSpecRow[];
  modificationsCount: number;
  buildDna: ShowcaseBuildDna | null;
}

export type ShareableSpecCardExportOptions = {
  filenameBase?: string;
  pixelRatio?: number;
};
