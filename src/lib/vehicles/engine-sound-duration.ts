import { engineSoundExtensionForFilename } from "@/lib/vehicles/engine-sound-constants";

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  if (offset + length > bytes.length) return "";
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readUInt32LE(bytes: Uint8Array, offset: number): number | null {
  if (offset + 4 > bytes.length) return null;
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  );
}

/** PCM / common WAV — duration from `fmt` + `data` chunks. */
export function readWavDurationSeconds(bytes: Uint8Array): number | null {
  if (bytes.length < 44) return null;
  if (readAscii(bytes, 0, 4) !== "RIFF") return null;
  if (readAscii(bytes, 8, 4) !== "WAVE") return null;

  let offset = 12;
  let byteRate: number | null = null;
  let dataSize: number | null = null;

  while (offset + 8 <= bytes.length) {
    const chunkId = readAscii(bytes, offset, 4);
    const chunkSize = readUInt32LE(bytes, offset + 4);
    if (chunkSize == null) break;
    offset += 8;

    if (chunkId === "fmt " && chunkSize >= 16 && offset + 12 <= bytes.length) {
      byteRate = readUInt32LE(bytes, offset + 8);
    } else if (chunkId === "data") {
      dataSize = chunkSize;
      break;
    }

    offset += chunkSize + (chunkSize % 2);
  }

  if (byteRate != null && dataSize != null && byteRate > 0) {
    return dataSize / byteRate;
  }
  return null;
}

/**
 * Best-effort duration for engine sound uploads (WAV from header; MP3/M4A often need client probe).
 */
export function measureEngineSoundDurationSeconds(
  bytes: Uint8Array,
  filename: string,
  mime = "",
): number | null {
  const ext =
    engineSoundExtensionForFilename(filename) ??
    (mime.toLowerCase().includes("wav") ? "wav" : null);

  if (ext === "wav" || readAscii(bytes, 0, 4) === "RIFF") {
    return readWavDurationSeconds(bytes);
  }

  if (ext === "mp3" || mime.toLowerCase().includes("mpeg")) {
    return estimateMp3DurationSeconds(bytes);
  }

  if (readAscii(bytes, 0, 3) === "ID3" || looksLikeMp3FrameSync(bytes, 0)) {
    return estimateMp3DurationSeconds(bytes);
  }

  return null;
}

const MP3_BITRATES_KBPS = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
] as const;

const MP3_SAMPLE_RATES = [44100, 48000, 32000] as const;

function looksLikeMp3FrameSync(bytes: Uint8Array, offset: number): boolean {
  return (
    offset + 1 < bytes.length &&
    bytes[offset] === 0xff &&
    (bytes[offset + 1] & 0xe0) === 0xe0
  );
}

function skipId3v2(bytes: Uint8Array): number {
  if (bytes.length < 10 || readAscii(bytes, 0, 3) !== "ID3") return 0;
  const size =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);
  return 10 + size;
}

/** CBR-oriented MP3 duration estimate from file size + first frame header. */
export function estimateMp3DurationSeconds(bytes: Uint8Array): number | null {
  if (bytes.length < 128) return null;

  let scanStart = skipId3v2(bytes);
  if (scanStart >= bytes.length) return null;

  for (let i = scanStart; i < Math.min(bytes.length - 4, scanStart + 4096); i++) {
    if (!looksLikeMp3FrameSync(bytes, i)) continue;

    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const layer = (b1 >> 1) & 0x03;
    if (layer !== 0x01) continue; // Layer III only

    const bitrateIndex = (b2 >> 4) & 0x0f;
    const sampleRateIndex = (b2 >> 2) & 0x03;
    if (bitrateIndex === 0 || bitrateIndex === 0x0f || sampleRateIndex === 0x03) {
      continue;
    }

    const bitrateKbps = MP3_BITRATES_KBPS[bitrateIndex];
    const sampleRate = MP3_SAMPLE_RATES[sampleRateIndex];
    if (!bitrateKbps || !sampleRate) continue;

    const audioBytes = bytes.length - scanStart;
    const duration = (audioBytes * 8) / (bitrateKbps * 1000);
    if (Number.isFinite(duration) && duration > 0) {
      return duration;
    }
    break;
  }

  return null;
}
