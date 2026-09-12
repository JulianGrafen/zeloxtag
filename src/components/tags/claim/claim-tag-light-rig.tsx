"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { DirectionalLight } from "three";

import {
  getTagKeyLightMotion,
  type TagPremiumMotionOptions,
} from "./claim-tag-premium-motion";

type ClaimTagKeyLightProps = TagPremiumMotionOptions;

export function ClaimTagKeyLight({ animate, reduceMotion }: ClaimTagKeyLightProps) {
  const light = useRef<DirectionalLight>(null);

  useFrame((state) => {
    if (!light.current) return;
    const { position, intensity } = getTagKeyLightMotion(state.clock.elapsedTime, {
      animate,
      reduceMotion,
    });
    light.current.position.set(position.x, position.y, position.z);
    light.current.intensity = intensity;
  });

  return (
    <directionalLight
      ref={light}
      position={[4, 6, 5]}
      intensity={1.55}
      color="#fffefb"
    />
  );
}
