import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import {
  buildPersonalityLabels,
  parseBuildPersonalityTags,
} from "@/lib/vehicles/build-personality-chips";

export type PublicSwipeCard = {
  id: string;
  carName: string;
  hp: number | null;
  totalInvestedAmount: number | null;
  thumbnailPath: string;
  top3Mods: string[];
  buildPersonalityTags: unknown;
  modificationCount: number;
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

function readStringField(
  record: Record<string, unknown>,
  snakeKey: string,
  camelKey: string,
): string {
  return readString(record[snakeKey] ?? record[camelKey]);
}

function readOptionalNumberField(
  record: Record<string, unknown>,
  snakeKey: string,
  camelKey: string,
): number | null {
  return readOptionalNumber(record[snakeKey] ?? record[camelKey]);
}

function readIntField(
  record: Record<string, unknown>,
  snakeKey: string,
  camelKey: string,
  fallback = 0,
): number {
  return readInt(record[snakeKey] ?? record[camelKey], fallback);
}

export function mapPublicSwipeCardRow(row: unknown): PublicSwipeCard | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = readString(record.id);
  const carName = readStringField(record, "car_name", "carName");
  const thumbnailPath = readStringField(record, "thumbnail_path", "thumbnailPath");
  if (!id || !carName || !thumbnailPath) return null;

  const topRaw = record.top_3_mods ?? record.top3Mods;
  const top3Mods = Array.isArray(topRaw)
    ? topRaw.filter((item): item is string => typeof item === "string")
    : [];

  const verified =
    record.is_verified_build === true || record.isVerifiedBuild === true;

  return {
    id,
    carName,
    hp: readOptionalNumber(record.hp),
    totalInvestedAmount: readOptionalNumberField(
      record,
      "total_invested_amount",
      "totalInvestedAmount",
    ),
    thumbnailPath,
    top3Mods,
    buildPersonalityTags:
      record.build_personality_tags ?? record.buildPersonalityTags ?? [],
    modificationCount: readIntField(
      record,
      "modification_count",
      "modificationCount",
      0,
    ),
    isVerifiedBuild: verified,
    upvotesCount: readIntField(record, "upvotes_count", "upvotesCount"),
    downvotesCount: readIntField(record, "downvotes_count", "downvotesCount"),
    cleanScorePercent: readOptionalNumberField(
      record,
      "clean_score_percent",
      "cleanScorePercent",
    ),
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
    heroImageUsesCover: true,
    powerPs: card.hp,
    torqueNm: null,
    accel0To100Sec: null,
    accel100To200Sec: null,
    modificationCount: Math.max(0, card.modificationCount),
    buildDna: null,
    buildPersonalityLabels: buildPersonalityLabels(
      parseBuildPersonalityTags(card.buildPersonalityTags),
    ),
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
    alreadyVoted:
      record.already_voted === true || record.alreadyVoted === true,
    upvotesCount: readIntField(record, "upvotes_count", "upvotesCount"),
    downvotesCount: readIntField(record, "downvotes_count", "downvotesCount"),
    cleanScorePercent: readOptionalNumberField(
      record,
      "clean_score_percent",
      "cleanScorePercent",
    ),
  };
}
