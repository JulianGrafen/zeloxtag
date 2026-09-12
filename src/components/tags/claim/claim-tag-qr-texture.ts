import QRCode from "qrcode";
import { CanvasTexture, SRGBColorSpace } from "three";

const QR_SIZE = 512;

/** Gravur-Look: dunkle Module auf gebürstetem Stahl (kein reines Weiß). */
export async function createClaimTagQrTexture(
  scanUrl: string,
): Promise<CanvasTexture> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, scanUrl, {
    width: QR_SIZE,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#1c1c1c",
      light: "#a3aab4",
    },
  });

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
