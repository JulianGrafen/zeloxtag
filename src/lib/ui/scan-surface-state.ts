/** True while an in-page scan picker / uploader is open (not only ?scan=1 deep links). */
let scanSurfaceActive = false;
const listeners = new Set<() => void>();

export function isScanSurfaceActive(): boolean {
  return scanSurfaceActive;
}

export function setScanSurfaceActive(active: boolean): void {
  if (scanSurfaceActive === active) return;
  scanSurfaceActive = active;
  listeners.forEach((listener) => listener());
}

export function subscribeScanSurface(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
