import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";

export type PublicSwipeCard = {
  id: string;
  carName: string;
  hp: number | null;
  totalInvestedAmount: number | null;
  thumbnailPath: string;
  top3Mods: string[];
  isVerifiedBuild: boolean;
  upvotesCount: number;
  downvotesCount: number;
  cleanScorePercent: number | null;
};

export type RegisterAnonymousSwipeResult = {
  ok: boolean;
  alreadyVoted: boolean;
  upvotesCount: number;
  downvotesCount: number;
  cleanScorePercent: number | null;
};

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readInt(value: unknown, fallback = 0): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

export function mapPublicSwipeCardRow(row: unknown): PublicSwipeCard | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = readString(record.id);
  const carName = readString(record.car_name);
  const thumbnailPath = readString(record.thumbnail_path);
  if (!id || !carName || !thumbnailPath) return null;

  const topRaw = record.top_3_mods;
  const top3Mods = Array.isArray(topRaw)
    ? topRaw.filter((item): item is string => typeof item === "string")
    : [];

  return {
    id,
    carName,
    hp: readOptionalNumber(record.hp),
    totalInvestedAmount: readOptionalNumber(record.total_invested_amount),
    thumbnailPath,
    top3Mods,
    isVerifiedBuild: record.is_verified_build === true,
    upvotesCount: readInt(record.upvotes_count),
    downvotesCount: readInt(record.downvotes_count),
    cleanScorePercent: readOptionalNumber(record.clean_score_percent),
  };
}

/** Maps anonymous swipe RPC cards into the authenticated entdecken stack shape. */
export function publicSwipeCardToShowcaseCard(
  card: PublicSwipeCard,
): ShowcaseSwipeCard {
  return {
    publicSlug: card.id,
    make: card.carName.trim(),
    model: "",
    year: null,
    totalLikes: card.upvotesCount,
    heroImageSrc: card.thumbnailPath,
    powerPs: card.hp,
    torqueNm: null,
    accel0To100Sec: null,
    accel100To200Sec: null,
    modificationCount: card.top3Mods.length,
    buildDna: null,
    buildPersonalityLabels: card.top3Mods.slice(0, 3),
  };
}

export function mapPublicSwipeCardList(rows: unknown): PublicSwipeCard[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => mapPublicSwipeCardRow(row))
    .filter((card): card is PublicSwipeCard => card != null);
}

export function mapRegisterAnonymousSwipeResult(
  row: unknown,
): RegisterAnonymousSwipeResult | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  if (record.ok !== true) return null;

  return {
    ok: true,
    alreadyVoted: record.already_voted === true,
    upvotesCount: readInt(record.upvotes_count),
    downvotesCount: readInt(record.downvotes_count),
    cleanScorePercent: readOptionalNumber(record.clean_score_percent),
  };
}
