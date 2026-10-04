import { SPEND_BUCKETS, type SpendBucket } from "@/lib/documents/cost-overview";

const BUCKET_SET = new Set<string>(SPEND_BUCKETS);

const CATEGORY_ALIASES: Record<string, SpendBucket> = {
  fahrwerk: "chassis",
  suspension: "chassis",
  wheels: "wheels_tires",
  tires: "wheels_tires",
  felgen: "wheels_tires",
  reifen: "wheels_tires",
  aero: "body_aero",
  karosserie: "body_aero",
  exterior: "body_aero",
  motor: "engine_exhaust",
  engine: "engine_exhaust",
  performance: "engine_exhaust",
  auspuff: "engine_exhaust",
  exhaust: "engine_exhaust",
  ecu: "electrical_ecu",
  elektronik: "electrical_ecu",
  interior: "other",
  tuning: "other",
  brakes: "other",
  bremsen: "other",
};

const FALLBACK_TODOS = [
  "Altteile demontieren / Fahrzeug vorbereiten",
  "Neues Teil einbauen und Anschlüsse prüfen",
  "Einstellen, Probefahrt und Dokumentation",
] as const;

function coerceNullableUrl(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseGermanMoney(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const cleaned = value
    .trim()
    .replace(/\s*€\s*/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function coerceCategory(value: unknown): SpendBucket | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  if (BUCKET_SET.has(key)) return key as SpendBucket;
  return CATEGORY_ALIASES[key] ?? null;
}

function coerceConfidence(value: unknown): "high" | "medium" | "low" {
  if (typeof value !== "string") return "medium";
  const v = value.trim().toLowerCase();
  if (v === "high" || v === "hoch") return "high";
  if (v === "low" || v === "niedrig" || v === "gering") return "low";
  if (v === "medium" || v === "mittel") return "medium";
  return "medium";
}

function coerceTodoRows(raw: unknown): Array<{ title: string; sortOrder: number }> {
  if (!Array.isArray(raw)) return [];

  const rows: Array<{ title: string; sortOrder: number }> = [];

  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (typeof item === "string" && item.trim().length >= 2) {
      rows.push({ title: item.trim(), sortOrder: index });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const titleRaw =
      row.title ?? row.step ?? row.label ?? row.name ?? row.text;
    if (typeof titleRaw !== "string" || titleRaw.trim().length < 2) continue;

    let sortOrder = index;
    if (typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder)) {
      sortOrder = Math.round(row.sortOrder);
    } else if (typeof row.sortOrder === "string") {
      const parsed = Number.parseInt(row.sortOrder, 10);
      if (Number.isFinite(parsed)) sortOrder = parsed;
    } else if (typeof row.order === "number") {
      sortOrder = Math.round(row.order);
    }

    rows.push({
      title: titleRaw.trim(),
      sortOrder: Math.min(99, Math.max(0, sortOrder)),
    });
  }

  return rows;
}

function ensureMinTodos(
  todos: Array<{ title: string; sortOrder: number }>,
): Array<{ title: string; sortOrder: number }> {
  const unique = todos.filter(
    (todo, idx, arr) =>
      arr.findIndex((t) => t.title.toLowerCase() === todo.title.toLowerCase()) ===
      idx,
  );

  if (unique.length >= 3) {
    return unique.slice(0, 14);
  }

  const padded = [...unique];
  for (const fallback of FALLBACK_TODOS) {
    if (padded.length >= 3) break;
    if (
      padded.some(
        (t) => t.title.toLowerCase() === fallback.toLowerCase(),
      )
    ) {
      continue;
    }
    padded.push({ title: fallback, sortOrder: padded.length });
  }

  return padded.slice(0, 14);
}

function unwrapExtractRoot(value: Record<string, unknown>): Record<string, unknown> {
  if (value.extract && typeof value.extract === "object") {
    return value.extract as Record<string, unknown>;
  }
  if (value.data && typeof value.data === "object") {
    return value.data as Record<string, unknown>;
  }
  if (value.result && typeof value.result === "object") {
    return value.result as Record<string, unknown>;
  }
  if (value.mod_package && typeof value.mod_package === "object") {
    return value.mod_package as Record<string, unknown>;
  }
  if (value.package && typeof value.package === "object") {
    return value.package as Record<string, unknown>;
  }
  return value;
}

/** Coerce common LLM quirks before Zod validation. */
export function normalizePlannedModExtractRaw(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const root = unwrapExtractRoot(value as Record<string, unknown>);

  const todosSource =
    root.todos ??
    root.steps ??
    root.checklist ??
    root.buildSteps ??
    root.schritte;

  let partRaw = root.part ?? root.mod ?? root.plannedMod ?? root.modification;
  if (!partRaw || typeof partRaw !== "object") {
    const goalRaw =
      root.goal ??
      root.buildGoal ??
      root.target ??
      root.projectTitle ??
      root.description;
    if (typeof root.title === "string" || typeof root.partName === "string") {
      partRaw = {
        title: root.title ?? root.partName,
        manufacturer: root.manufacturer ?? root.brand ?? null,
        category: root.category ?? null,
        plannedPriceEur:
          root.plannedPriceEur ??
          root.estimated_price ??
          root.estimatedPrice ??
          root.price ??
          root.amount,
        productUrl: root.productUrl ?? root.url ?? null,
      };
    } else if (typeof goalRaw === "string" && goalRaw.trim().length >= 2) {
      partRaw = {
        title: goalRaw.trim(),
        manufacturer: null,
        category: root.category ?? "engine_exhaust",
        plannedPriceEur: null,
        productUrl: null,
      };
    }
  }

  if (!partRaw || typeof partRaw !== "object") {
    return {
      ...root,
      part: {
        title: "Geplantes Bauteil",
        manufacturer: null,
        category: null,
        plannedPriceEur: null,
        productUrl: null,
      },
      todos: ensureMinTodos(coerceTodoRows(todosSource)),
      confidence: coerceConfidence(root.confidence),
      warnings: [],
    };
  }

  const part = { ...(partRaw as Record<string, unknown>) };
  const titleRaw =
    part.title ?? part.name ?? part.partName ?? part.productName;
  let title =
    typeof titleRaw === "string" ? titleRaw.trim() : "Geplantes Bauteil";
  if (title.length < 2) title = "Geplantes Bauteil";

  part.title = title.slice(0, 160);
  part.manufacturer =
    typeof part.manufacturer === "string"
      ? part.manufacturer.trim() || null
      : typeof part.brand === "string"
        ? part.brand.trim() || null
        : null;
  part.productUrl = coerceNullableUrl(
    part.productUrl ?? part.url ?? part.link,
  );
  part.category = coerceCategory(part.category);
  part.plannedPriceEur = parseGermanMoney(
    part.plannedPriceEur ??
      part.price ??
      part.priceEur ??
      part.amount ??
      root.estimated_price ??
      root.estimatedPrice,
  );

  const warnings = Array.isArray(root.warnings)
    ? root.warnings
        .filter((w): w is string => typeof w === "string" && w.trim().length > 0)
        .map((w) => w.trim().slice(0, 240))
        .slice(0, 8)
    : [];

  const todos = ensureMinTodos(coerceTodoRows(todosSource)).map((todo) => ({
    title: todo.title,
    sortOrder: Math.min(99, Math.max(0, Math.round(todo.sortOrder))),
  }));

  let category = coerceCategory(part.category);
  if (!category && /ps|leistung|power|stage|turbo|motor/i.test(title)) {
    category = "engine_exhaust";
  }

  return {
    part: {
      title: part.title,
      manufacturer: part.manufacturer,
      category,
      plannedPriceEur: part.plannedPriceEur,
      productUrl: part.productUrl,
    },
    todos,
    confidence: coerceConfidence(root.confidence),
    warnings,
  };
}

/** Strip HTML for shop pages — keeps LLM context usable. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}
