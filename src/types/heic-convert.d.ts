declare module "heic-convert" {
  type HeicConvertOptions = {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality?: number;
  };

  function convert(options: HeicConvertOptions): Promise<ArrayBuffer | Uint8Array>;

  export default convert;
}
