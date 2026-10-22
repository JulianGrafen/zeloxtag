export function playbackErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Wiedergabe blockiert — bitte erneut tippen.";
    }
    if (error.name === "NotSupportedError") {
      return "Format wird auf diesem Gerät nicht unterstützt.";
    }
  }
  return "Sound konnte nicht abgespielt werden.";
}
