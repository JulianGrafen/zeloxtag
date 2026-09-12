/** Poliigon MetalSteelBrushed 7174 — 2K, nur PBR-Maps (Gravur bleibt GLB-`map`). */
export const TAG_BRUSHED_STEEL_TEXTURES = {
  normal: "/textures/tag-steel-brushed/normal.png",
  roughness: "/textures/tag-steel-brushed/roughness.jpg",
  metalness: "/textures/tag-steel-brushed/metallic.jpg",
} as const;

/** Weniger Kachelung → größere Texel → schärfere Bürste auf dem Tag. */
export const TAG_BRUSHED_STEEL_UV_REPEAT = 3.5;
