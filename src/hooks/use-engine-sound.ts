"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export type EngineSoundPlaybackState = "idle" | "playing";

type UseEngineSoundOptions = {
  soundUrl: string | null;
  onPlaybackError?: (message: string) => void;
};

type UseEngineSoundResult = {
  audioRef: RefObject<HTMLAudioElement | null>;
  playbackState: EngineSoundPlaybackState;
  isPlaying: boolean;
  togglePlayback: () => void;
  handleAudioEnded: () => void;
  handleAudioError: () => void;
};

function playbackErrorMessage(error: unknown): string {
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

export function useEngineSound({
  soundUrl,
  onPlaybackError,
}: UseEngineSoundOptions): UseEngineSoundResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playbackState, setPlaybackState] =
    useState<EngineSoundPlaybackState>("idle");

  useEffect(() => {
    setPlaybackState("idle");
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    if (soundUrl?.trim()) {
      audio.load();
    }
  }, [soundUrl]);

  const resetPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaybackState("idle");
  }, []);

  const handleAudioEnded = useCallback(() => {
    resetPlayback();
  }, [resetPlayback]);

  const handleAudioError = useCallback(() => {
    resetPlayback();
    onPlaybackError?.(
      "Sounddatei konnte nicht geladen werden — bitte Seite neu laden oder Sound erneut hochladen.",
    );
  }, [onPlaybackError, resetPlayback]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !soundUrl?.trim()) return;

    if (playbackState === "playing") {
      resetPlayback();
      return;
    }

    audio.load();
    void audio
      .play()
      .then(() => {
        setPlaybackState("playing");
      })
      .catch((error) => {
        resetPlayback();
        onPlaybackError?.(playbackErrorMessage(error));
      });
  }, [onPlaybackError, playbackState, resetPlayback, soundUrl]);

  return {
    audioRef,
    playbackState,
    isPlaying: playbackState === "playing",
    togglePlayback,
    handleAudioEnded,
    handleAudioError,
  };
}
