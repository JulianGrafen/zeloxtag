"use client";

import { AudioLines, Loader2, Pause, Play, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import {
  ENGINE_SOUND_ACCEPT,
  ENGINE_SOUND_MAX_SECONDS,
} from "@/lib/vehicles/engine-sound-constants";
import { validateEngineSoundUploadBytes } from "@/lib/vehicles/engine-sound-validation";
import { measureAudioFileDurationSeconds } from "@/lib/vehicles/measure-audio-duration";
import { cn } from "@/lib/utils";

export type ClaimEngineSoundSelection = {
  file: File;
  durationSeconds: number;
};

type ClaimEngineSoundPickerProps = {
  value: ClaimEngineSoundSelection | null;
  onChange: (value: ClaimEngineSoundSelection | null) => void;
  disabled?: boolean;
};

/**
 * Optional Soundcheck in onboarding: validates like the real upload (format,
 * ≤ 10 s, ≤ 2 MB) so the deferred upload after account creation won't fail.
 */
export function ClaimEngineSoundPicker({
  value,
  onChange,
  disabled = false,
}: ClaimEngineSoundPickerProps) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrl = useMemo(
    () => (value ? URL.createObjectURL(value.file) : null),
    [value],
  );

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setChecking(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const measured = await measureAudioFileDurationSeconds(file, bytes);
      const meta = validateEngineSoundUploadBytes(
        bytes,
        file.type,
        file.name,
        measured,
      );
      if (!meta.ok) {
        setError(meta.error);
        return;
      }
      const durationSeconds =
        Number.isFinite(measured) && measured > 0 && measured < 86400
          ? measured
          : 1;
      onChange({ file, durationSeconds });
    } catch {
      setError("Die Datei konnte nicht gelesen werden. Probier MP3, M4A oder WAV.");
    } finally {
      setChecking(false);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().then(() => setPlaying(true)).catch(() => undefined);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="claim-sound">
      {value && previewUrl ? (
        <div className="claim-sound__card claim-sound__card--filled">
          <button
            type="button"
            onClick={togglePlay}
            className="claim-sound__play"
            aria-label={playing ? "Pausieren" : "Abspielen"}
          >
            {playing ? (
              <Pause className="h-5 w-5" aria-hidden />
            ) : (
              <Play className="h-5 w-5 translate-x-px" aria-hidden />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="claim-sound__title">Soundcheck bereit</p>
            <p className="claim-sound__meta">
              {value.file.name} · {value.durationSeconds.toFixed(1).replace(".", ",")} s
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              audioRef.current?.pause();
              setPlaying(false);
              onChange(null);
            }}
            className="claim-sound__remove"
            aria-label="Soundcheck entfernen"
            disabled={disabled}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          <audio
            ref={audioRef}
            src={previewUrl}
            preload="metadata"
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        </div>
      ) : (
        <label
          className={cn(
            "claim-sound__card claim-sound__card--empty",
            (disabled || checking) && "pointer-events-none opacity-60",
          )}
        >
          <span className="claim-sound__icon" aria-hidden>
            {checking ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <AudioLines className="h-5 w-5" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="claim-sound__title">Sound hinzufügen</span>
            <span className="claim-sound__meta">
              Kaltstart oder Gasstoß, max. {ENGINE_SOUND_MAX_SECONDS} s
            </span>
          </span>
          <span className="claim-sound__badge">Optional</span>
          <input
            type="file"
            accept={ENGINE_SOUND_ACCEPT}
            className="sr-only"
            onChange={handleFile}
            disabled={disabled || checking}
          />
        </label>
      )}
      {error ? (
        <p role="alert" className="vd-alert-error mt-2 text-center text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
