import { engineSoundContentTypeFromPath } from "@/lib/vehicles/engine-sound-constants";

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
]);

export async function buildEngineSoundHttpResponse(
  data: Blob,
  storagePath: string,
  cacheControl: string,
): Promise<Response> {
  const buffer = Buffer.from(await data.arrayBuffer());
  const storedType = data.type?.split(";")[0]?.trim().toLowerCase() ?? "";
  const contentType = ALLOWED_AUDIO_TYPES.has(storedType)
    ? storedType
    : engineSoundContentTypeFromPath(storagePath);
  const filename = (storagePath.split("/").pop() ?? "engine-sound").replace(
    /[^\w.-]/g,
    "_",
  );

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": cacheControl,
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
