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
};

type UseEngineSoundResult = {
  audioRef: RefObject<HTMLAudioElement | null>;
  playbackState: EngineSoundPlaybackState;
  isPlaying: boolean;
  togglePlayback: () => void;
  handleAudioEnded: () => void;
};

export function useEngineSound({
  soundUrl,
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

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !soundUrl?.trim()) return;

    if (playbackState === "playing") {
      resetPlayback();
      return;
    }

    void audio
      .play()
      .then(() => {
        setPlaybackState("playing");
      })
      .catch(() => {
        resetPlayback();
      });
  }, [playbackState, resetPlayback, soundUrl]);

  return {
    audioRef,
    playbackState,
    isPlaying: playbackState === "playing",
    togglePlayback,
    handleAudioEnded,
  };
}
