import { readFile } from "node:fs/promises";
import { join } from "node:path";

type StoryCardOgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

let cachedFonts: StoryCardOgFont[] | null = null;

export async function loadStoryCardOgFonts(): Promise<StoryCardOgFont[]> {
  if (cachedFonts) {
    return cachedFonts;
  }

  const base = join(
    process.cwd(),
    "node_modules/@fontsource/inter/files",
  );

  const [regular, bold] = await Promise.all([
    readFile(join(base, "inter-latin-400-normal.woff")),
    readFile(join(base, "inter-latin-700-normal.woff")),
  ]);

  cachedFonts = [
    {
      name: "Inter",
      data: regular,
      weight: 400,
      style: "normal",
    },
    {
      name: "Inter",
      data: bold,
      weight: 700,
      style: "normal",
    },
  ];

  return cachedFonts;
}
