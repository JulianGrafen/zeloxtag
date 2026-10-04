import type { VehicleRoastResult } from "@/lib/roast/roast-schema";

export type RoastStoryImageInput = {
  vehicleLabel: string;
  roast: VehicleRoastResult;
};

const WIDTH = 1080;
const HEIGHT = 1920;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = "left",
): number {
  ctx.textAlign = align;
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  const drawX = align === "center" ? x + maxWidth / 2 : x;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, drawX, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, drawX, cursorY);
    cursorY += lineHeight;
  }
  ctx.textAlign = "left";
  return cursorY;
}

export async function renderRoastStoryImage(
  input: RoastStoryImageInput,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas nicht verfügbar.");
  }

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#07070c");
  gradient.addColorStop(0.55, "#101018");
  gradient.addColorStop(1, "#1a0a12");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "rgba(255, 51, 102, 0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, WIDTH - 96, HEIGHT - 96);

  ctx.fillStyle = "#ff3366";
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ROAST MY BUILD", WIDTH / 2, 140);
  ctx.textAlign = "left";

  ctx.fillStyle = "#8b8b9a";
  ctx.font = "500 38px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(input.vehicleLabel, WIDTH / 2, 220);
  ctx.textAlign = "left";

  ctx.fillStyle = "#f2f2f8";
  ctx.font = "600 52px system-ui, sans-serif";
  const quote = `„${input.roast.punchline}"`;
  wrapText(ctx, quote, 72, 520, WIDTH - 144, 64, "center");

  ctx.fillStyle = "#6f6f80";
  ctx.font = "600 32px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("zeloxtag.de", WIDTH / 2, HEIGHT - 96);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("PNG Export fehlgeschlagen."));
          return;
        }
        resolve(blob);
      },
      "image/png",
      1,
    );
  });
}

export async function downloadRoastStoryImage(
  input: RoastStoryImageInput,
): Promise<void> {
  const blob = await renderRoastStoryImage(input);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `zeloxtag-roast-${Date.now()}.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareRoastStoryImage(
  input: RoastStoryImageInput,
): Promise<"shared" | "downloaded"> {
  const blob = await renderRoastStoryImage(input);
  const file = new File([blob], "zeloxtag-roast.png", { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare?.({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      title: "Roast My Build",
      text: input.roast.punchline,
    });
    return "shared";
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `zeloxtag-roast-${Date.now()}.png`;
  anchor.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
