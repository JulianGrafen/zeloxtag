"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { playbackErrorMessage } from "@/lib/audio/playback-error-message";
import { volumeFadeStep } from "@/lib/audio/volume-fade-step";

export const HOLD_ENGINE_SOUND_FADE_MS = 175;

type UseHoldEngineSoundOptions = {
  soundUrl: string | null;
  onPlaybackError?: (message: string) => void;
  fadeMs?: number;
};

type UseHoldEngineSoundResult = {
  audioRef: RefObject<HTMLAudioElement | null>;
  isHolding: boolean;
  isFading: boolean;
  isActive: boolean;
  startHold: () => void;
  endHold: () => void;
  handleAudioEnded: () => void;
  handleAudioError: () => void;
};

export function useHoldEngineSound({
  soundUrl,
  onPlaybackError,
  fadeMs = HOLD_ENGINE_SOUND_FADE_MS,
}: UseHoldEngineSoundOptions): UseHoldEngineSoundResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const holdingRef = useRef(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const clearFade = useCallback(() => {
    if (fadeFrameRef.current != null) {
      cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
    setIsFading(false);
  }, []);

  const resetAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    clearFade();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
  }, [clearFade]);

  useEffect(() => {
    holdingRef.current = false;
    setIsHolding(false);
    resetAudio();
    const audio = audioRef.current;
    if (audio && soundUrl?.trim()) {
      audio.load();
    }
  }, [soundUrl, resetAudio]);

  useEffect(() => {
    return () => {
      clearFade();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.volume = 1;
      }
    };
  }, [clearFade]);

  const handleAudioEnded = useCallback(() => {
    holdingRef.current = false;
    setIsHolding(false);
    resetAudio();
  }, [resetAudio]);

  const handleAudioError = useCallback(() => {
    holdingRef.current = false;
    setIsHolding(false);
    resetAudio();
    onPlaybackError?.(
      "Sounddatei konnte nicht geladen werden — bitte Seite neu laden oder Sound erneut hochladen.",
    );
  }, [onPlaybackError, resetAudio]);

  const runFadeOut = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) {
      resetAudio();
      return;
    }

    clearFade();
    setIsFading(true);
    const startVolume = audio.volume > 0 ? audio.volume : 1;
    const startedAt = performance.now();

    const step = () => {
      const audioEl = audioRef.current;
      if (!audioEl) {
        setIsFading(false);
        return;
      }

      const elapsed = performance.now() - startedAt;
      const { volume, done } = volumeFadeStep({
        startVolume,
        elapsedMs: elapsed,
        fadeMs,
      });

      if (done) {
        audioEl.volume = 0;
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl.volume = 1;
        fadeFrameRef.current = null;
        setIsFading(false);
        return;
      }

      audioEl.volume = volume;
      fadeFrameRef.current = requestAnimationFrame(step);
    };

    fadeFrameRef.current = requestAnimationFrame(step);
  }, [clearFade, fadeMs, resetAudio]);

  const startHold = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !soundUrl?.trim()) return;

    holdingRef.current = true;
    setIsHolding(true);
    clearFade();
    audio.volume = 1;

    if (!audio.paused && !audio.ended) {
      return;
    }

    audio.load();
    void audio.play().catch((error) => {
      if (!holdingRef.current) return;
      holdingRef.current = false;
      setIsHolding(false);
      resetAudio();
      onPlaybackError?.(playbackErrorMessage(error));
    });
  }, [clearFade, onPlaybackError, resetAudio, soundUrl]);

  const endHold = useCallback(() => {
    holdingRef.current = false;
    setIsHolding(false);

    const audio = audioRef.current;
    if (!audio || audio.paused) {
      resetAudio();
      return;
    }

    runFadeOut();
  }, [resetAudio, runFadeOut]);

  return {
    audioRef,
    isHolding,
    isFading,
    isActive: isHolding || isFading,
    startHold,
    endHold,
    handleAudioEnded,
    handleAudioError,
  };
}
