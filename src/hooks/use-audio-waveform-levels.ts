"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const BAR_COUNT = 28;

type AudioGraph = {
  context: AudioContext;
  analyser: AnalyserNode;
};

function buildIdleLevels(): number[] {
  return Array.from({ length: BAR_COUNT }, (_, index) => {
    const center = (BAR_COUNT - 1) / 2;
    const falloff = 1 - Math.abs(index - center) / center;
    return 0.12 + falloff * 0.08;
  });
}

function buildSyntheticPlayingLevels(t: number): number[] {
  return Array.from({ length: BAR_COUNT }, (_, index) => {
    const phase = t * 0.012 + index * 0.45;
    const wave = (Math.sin(phase) + 1) / 2;
    const center = (BAR_COUNT - 1) / 2;
    const falloff = 1 - Math.abs(index - center) / (center + 0.5);
    return 0.18 + wave * 0.55 * Math.max(0.35, falloff);
  });
}

function readAnalyserLevels(
  analyser: AnalyserNode,
  buffer: Uint8Array<ArrayBuffer>,
): number[] {
  analyser.getByteFrequencyData(buffer);
  const step = Math.floor(buffer.length / BAR_COUNT);
  return Array.from({ length: BAR_COUNT }, (_, index) => {
    const start = index * step;
    let sum = 0;
    for (let i = 0; i < step; i += 1) {
      sum += buffer[start + i] ?? 0;
    }
    const avg = sum / step / 255;
    return Math.min(1, 0.08 + avg * 1.35);
  });
}

export function useAudioWaveformLevels(
  audioRef: RefObject<HTMLAudioElement | null>,
  active: boolean,
): number[] {
  const [levels, setLevels] = useState<number[]>(() => buildIdleLevels());
  const graphRef = useRef<AudioGraph | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setLevels(buildIdleLevels());
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    let analyser: AnalyserNode | null = null;

    try {
      if (!graphRef.current) {
        const context = new AudioContext();
        const source = context.createMediaElementSource(audio);
        analyser = context.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.78;
        source.connect(analyser);
        analyser.connect(context.destination);
        graphRef.current = { context, analyser };
      } else {
        analyser = graphRef.current.analyser;
      }
      void graphRef.current.context.resume();
    } catch {
      analyser = null;
    }

    if (analyser && !dataRef.current) {
      dataRef.current = new Uint8Array(
        analyser.frequencyBinCount,
      ) as Uint8Array<ArrayBuffer>;
    }

    const tick = (time: number) => {
      if (analyser && dataRef.current) {
        setLevels(readAnalyserLevels(analyser, dataRef.current));
      } else {
        setLevels(buildSyntheticPlayingLevels(time));
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active, audioRef]);

  return levels;
}
