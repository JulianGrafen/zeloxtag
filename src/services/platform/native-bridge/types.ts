export type HapticStyle = "light" | "medium" | "success";

export type CapturedImage = {
  blob: Blob;
  mimeType: string;
  fileName: string;
};

export type ShareContentPayload = {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
};

export type ShareContentResult =
  | "shared"
  | "copied"
  | "cancelled"
  | "unavailable";
