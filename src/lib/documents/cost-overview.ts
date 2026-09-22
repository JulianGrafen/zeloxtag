import { parseLineItems } from "@/lib/documents/line-items";
import {
  INVOICE_LIST_CATEGORY_LABELS,
  resolveInvoiceListCategory,
  type InvoiceListCategory,
} from "@/lib/documents/invoice-categories";
import { filterInvoiceReceiptDocuments } from "@/lib/documents/invoice-receipts";
import {
  isInvoiceRepairLine,
  isInvoiceServiceLine,
  isInvoiceVatOrTotalLine,
  isTuningLineLabel,
} from "@/lib/documents/invoice-title";
import { resolveDocumentAmount } from "@/lib/vehicles/expose-data";
import type { Document } from "@/types/database";

export const SPEND_BUCKETS = [
  "wheels_tires",
  "chassis",
  "body_aero",
  "engine_exhaust",
  "electrical_ecu",
  "other",
] as const;

export type SpendBucket = (typeof SPEND_BUCKETS)[number];

export const SPEND_BUCKET_LABELS: Record<SpendBucket, string> = {
  wheels_tires: "Felgen & Reifen",
  chassis: "Fahrwerk",
  body_aero: "Karosserie & Aero",
  engine_exhaust: "Motor & Auspuff",
  electrical_ecu: "Elektrik & ECU",
  other: "Sonstiges",
};

const VAULT_PART_TO_BUCKET: Record<string, SpendBucket> = {
  RÄDER_FELGEN: "wheels_tires",
  FAHRWERK: "chassis",
  AERODYNAMIK_KAROSSERIE: "body_aero",
  MOTOR_ABGAS_ANSAUGUNG: "engine_exhaust",
  SONSTIGES: "other",
};

type KeywordRule = { bucket: SpendBucket; patterns: RegExp[] };

const KEYWORD_RULES: KeywordRule[] = [
  {
    bucket: "wheels_tires",
    patterns: [
      /\bfelgen/i,
      /\breifen\b/i,
      /\bräder\b/i,
      /\bwheel/i,
      /\btire/i,
      /\breifenwerk\b/i,
      /\bet\d{2}\b/i,
    ],
  },
  {
    bucket: "chassis",
    patterns: [
      /\bfahrwerk\b/i,
      /\bgewindefahrwerk\b/i,
      /\bcoilover/i,
      /\bst\s*xa\b/i,
      /\bstabilisator/i,
      /\bdomlager/i,
      /\buniball/i,
      /\bchassis\b/i,
      /\bmontagekit\b/i,
      /\bkw\s+v[0-9]/i,
    ],
  },
  {
    bucket: "body_aero",
    patterns: [
      /\bkarosserie\b/i,
      /\bbodykit\b/i,
      /\bspoiler\b/i,
      /\bflügel\b/i,
      /\bwing\b/i,
      /\bdiffusor/i,
      /\bfrontlip/i,
      /\bheckdiffusor/i,
      /\baerodynamik/i,
      /\bverbreiterung/i,
    ],
  },
  {
    bucket: "engine_exhaust",
    patterns: [
      /\bmotor\b/i,
      /\bturbo\b/i,
      /\bkompressor/i,
      /\babgasanlage/i,
      /\bdownpipe/i,
      /\bkrümmer/i,
      /\bansaug/i,
      /\bintercooler/i,
      /\bgetriebe\b/i,
      /\bexhaust\b/i,
      /\bsportauspuff/i,
      /\bauspuffanlage/i,
      /\bauspuff\b/i,
    ],
  },
  {
    bucket: "electrical_ecu",
    patterns: [
      /\belektrik\b/i,
      /\becu\b/i,
      /\bsteuergerät/i,
      /\bchiptuning/i,
      /\bmap\b/i,
      /\bdisplay\b/i,
      /\blicht\b/i,
      /\bled\b/i,
      /\bverkabelung/i,
    ],
  },
];

export function classifySpendBucket(
  label: string | null | undefined,
  partCategory?: string | null,
): SpendBucket {
  const categoryKey = partCategory?.trim();
  if (categoryKey && VAULT_PART_TO_BUCKET[categoryKey]) {
    return VAULT_PART_TO_BUCKET[categoryKey];
  }

  const haystack = label?.trim() ?? "";
  if (!haystack) return "other";

  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return rule.bucket;
    }
  }

  return "other";
}

export type CostBucketBreakdownRow = {
  bucket: SpendBucket;
  label: string;
  amount: number;
};

export type CostModificationLine = {
  label: string;
  amount: number;
  bucket: SpendBucket;
  bucketLabel: string;
};

export type CostModificationStats = {
  total: number;
  positionCount: number;
  averagePerPosition: number;
  mostExpensiveLabel: string | null;
  mostExpensiveAmount: number | null;
};

export type CostMaintenanceCategoryRow = {
  category: InvoiceListCategory;
  label: string;
  amount: number;
};

export type CostMaintenanceStats = {
  total: number;
  categories: CostMaintenanceCategoryRow[];
};

export type CostYearlyPoint = {
  year: number;
  amount: number;
};

export type VehicleCostOverview = {
  totalInvestment: number;
  documentsWithoutAmountCount: number;
  invoiceCount: number;
  bucketBreakdown: CostBucketBreakdownRow[];
  modificationLines: CostModificationLine[];
  modification: CostModificationStats;
  maintenance: CostMaintenanceStats;
  yearlySeries: CostYearlyPoint[];
};

function documentYear(doc: Document): number | null {
  const raw = doc.date?.trim() || doc.created_at?.slice(0, 10);
  if (!raw || raw.length < 4) return null;
  const year = Number.parseInt(raw.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

type ModPosition = { label: string; amount: number; bucket: SpendBucket };

function isExcludedUmbauLine(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return true;
  if (isInvoiceVatOrTotalLine(trimmed)) return true;
  if (isInvoiceServiceLine(trimmed)) return true;
  if (isInvoiceRepairLine(trimmed)) return true;
  if (/summe der positionen/i.test(trimmed)) return true;
  return false;
}

function shouldIncludeUmbauLine(
  label: string,
  listCategory: InvoiceListCategory,
): boolean {
  if (isExcludedUmbauLine(label)) return false;
  if (listCategory !== "tuning" && listCategory !== "other") return false;
  return (
    isTuningLineLabel(label) ||
    classifySpendBucket(label) !== "other"
  );
}

function collectModificationPositions(
  doc: Document,
  listCategory: InvoiceListCategory,
): ModPosition[] {
  const lines = parseLineItems(doc.line_items) ?? [];
  const withAmount = lines.filter(
    (item) => Number.isFinite(item.amount) && item.amount > 0,
  );

  const fromLines = withAmount
    .filter((item) => shouldIncludeUmbauLine(item.label, listCategory))
    .map((item) => ({
      label: item.label.trim(),
      amount: item.amount,
      bucket: classifySpendBucket(item.label, doc.part_category),
    }));

  if (fromLines.length > 0) {
    return fromLines;
  }

  const amount = resolveDocumentAmount(doc);
  if (amount == null || amount <= 0) return [];

  const fallbackLabel =
    doc.title?.trim() || doc.vendor?.trim() || "Umbau";
  const combined = `${fallbackLabel} ${doc.vendor ?? ""}`;
  if (!shouldIncludeUmbauLine(combined, listCategory)) {
    return [];
  }

  return [
    {
      label: fallbackLabel,
      amount,
      bucket: classifySpendBucket(combined, doc.part_category),
    },
  ];
}

function contributesToUmbauBuckets(
  listCategory: InvoiceListCategory,
): boolean {
  return listCategory === "tuning" || listCategory === "other";
}

export function buildVehicleCostOverview(
  documents: Document[],
): VehicleCostOverview {
  const invoices = filterInvoiceReceiptDocuments(documents);

  let totalInvestment = 0;
  let documentsWithoutAmountCount = 0;
  const bucketTotals = Object.fromEntries(
    SPEND_BUCKETS.map((bucket) => [bucket, 0]),
  ) as Record<SpendBucket, number>;

  const modificationPositions: ModPosition[] = [];
  const maintenanceByCategory = new Map<InvoiceListCategory, number>();
  const yearlyTotals = new Map<number, number>();

  for (const doc of invoices) {
    const amount = resolveDocumentAmount(doc);
    if (amount == null || !Number.isFinite(amount)) {
      documentsWithoutAmountCount += 1;
      continue;
    }

    totalInvestment += amount;

    const year = documentYear(doc);
    if (year != null) {
      yearlyTotals.set(year, (yearlyTotals.get(year) ?? 0) + amount);
    }

    const listCategory = resolveInvoiceListCategory(doc.category);

    if (contributesToUmbauBuckets(listCategory)) {
      modificationPositions.push(
        ...collectModificationPositions(doc, listCategory),
      );
    }

    if (listCategory === "repair" || listCategory === "service") {
      maintenanceByCategory.set(
        listCategory,
        roundMoney((maintenanceByCategory.get(listCategory) ?? 0) + amount),
      );
    }
  }

  for (const position of modificationPositions) {
    bucketTotals[position.bucket] = roundMoney(
      bucketTotals[position.bucket] + position.amount,
    );
  }

  const modificationTotal = roundMoney(
    modificationPositions.reduce((sum, item) => sum + item.amount, 0),
  );
  const positionCount = modificationPositions.length;

  let mostExpensiveLabel: string | null = null;
  let mostExpensiveAmount: number | null = null;
  for (const position of modificationPositions) {
    if (
      mostExpensiveAmount == null ||
      position.amount > mostExpensiveAmount
    ) {
      mostExpensiveAmount = position.amount;
      mostExpensiveLabel = position.label;
    }
  }

  const bucketBreakdown: CostBucketBreakdownRow[] = [...SPEND_BUCKETS]
    .map((bucket) => ({
      bucket,
      label: SPEND_BUCKET_LABELS[bucket],
      amount: bucketTotals[bucket],
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return (
        SPEND_BUCKETS.indexOf(a.bucket) - SPEND_BUCKETS.indexOf(b.bucket)
      );
    });

  const modificationLines: CostModificationLine[] = modificationPositions
    .map((position) => ({
      label: position.label,
      amount: position.amount,
      bucket: position.bucket,
      bucketLabel: SPEND_BUCKET_LABELS[position.bucket],
    }))
    .sort((a, b) => b.amount - a.amount);

  const maintenanceCategories: CostMaintenanceCategoryRow[] = (
    ["repair", "service"] as const
  )
    .map((category) => ({
      category,
      label: INVOICE_LIST_CATEGORY_LABELS[category],
      amount: maintenanceByCategory.get(category) ?? 0,
    }))
    .filter((row) => row.amount > 0);

  const maintenanceTotal = roundMoney(
    maintenanceCategories.reduce((sum, row) => sum + row.amount, 0),
  );

  const yearlySeries: CostYearlyPoint[] = [...yearlyTotals.entries()]
    .map(([year, yearAmount]) => ({
      year,
      amount: roundMoney(yearAmount),
    }))
    .sort((a, b) => a.year - b.year);

  return {
    totalInvestment: roundMoney(totalInvestment),
    documentsWithoutAmountCount,
    invoiceCount: invoices.length,
    bucketBreakdown,
    modificationLines,
    modification: {
      total: modificationTotal,
      positionCount,
      averagePerPosition:
        positionCount > 0
          ? roundMoney(modificationTotal / positionCount)
          : 0,
      mostExpensiveLabel,
      mostExpensiveAmount,
    },
    maintenance: {
      total: maintenanceTotal,
      categories: maintenanceCategories,
    },
    yearlySeries,
  };
}
