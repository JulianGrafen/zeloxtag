/** One kW / tire / Auflagen row under a vehicle block (merged-cell child row). */
export interface AbeConfiguration {
  /** e.g. "85-141" */
  kw_range: string;
  /** e.g. "205/50R17" */
  tire_size: string;
  /** Merged codes from Reifenbezogene Auflagen + Auflagen und Hinweise (cleaned). */
  auflagen_codes: string[];
}

/** Vehicle block from the Handelsbezeichnung column (may span multiple configuration rows). */
export interface AbeVehicle {
  /** Commercial name only — e.g. "BMW 3er-Reihe" (no Fahrzeugtyp / EG-BE). */
  model_name: string;
  configurations: AbeConfiguration[];
}

/** Vision-LLM structured output for a German ABE / Gutachten compatibility table. */
export interface AbeTableExtraction {
  vehicles: AbeVehicle[];
}

export type AbeVehicleSelection = {
  vehicle: AbeVehicle;
  configuration: AbeConfiguration;
  configurationIndex: number;
  auflagen_codes: string[];
};
