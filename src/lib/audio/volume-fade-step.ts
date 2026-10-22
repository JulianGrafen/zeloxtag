export type VolumeFadeStepInput = {
  startVolume: number;
  elapsedMs: number;
  fadeMs: number;
};

export type VolumeFadeStepResult = {
  volume: number;
  done: boolean;
};

export function volumeFadeStep({
  startVolume,
  elapsedMs,
  fadeMs,
}: VolumeFadeStepInput): VolumeFadeStepResult {
  const progress = Math.min(1, Math.max(0, elapsedMs / fadeMs));
  if (progress >= 1) {
    return { volume: 0, done: true };
  }
  const base = startVolume > 0 ? startVolume : 1;
  return { volume: base * (1 - progress), done: false };
}
