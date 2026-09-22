export type ShowcaseSwipeDecision = "like" | "pass";

export type ShowcaseSwipeCard = {
  publicSlug: string;
  make: string;
  model: string;
  year: number | null;
  heroImageSrc: string | null;
  powerPs: number | null;
  torqueNm: number | null;
  accel0To100Sec: number | null;
  accel100To200Sec: number | null;
  modificationCount: number;
};

export type ShowcaseSwipeInboxRow = {
  vehicleId: string;
  tagUuid: string | null;
  make: string;
  model: string;
  totalLikes: number;
  unreadLikes: number;
};
