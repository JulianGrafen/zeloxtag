export interface VehicleSpecMetric {
  label: string;
  value: number | string;
  unit: string;
  stockValue?: number;
  maxValue: number;
  delta?: string;
}

export interface ShareableBuildData {
  modelName: string;
  stageInfo: string;
  imageUrl?: string;
  metrics: {
    power: VehicleSpecMetric;
    torque: VehicleSpecMetric;
    powerToWeight: VehicleSpecMetric;
    modsCount: number;
  };
  v4aTagId?: string;
}

export type ShareableSpecCardExportOptions = {
  filenameBase?: string;
  pixelRatio?: number;
};
