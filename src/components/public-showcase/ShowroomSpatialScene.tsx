"use client";

import Image from "next/image";
import { Expand } from "lucide-react";
import { motion, useTransform, type MotionValue } from "framer-motion";

import type { ShowroomHeroKind } from "@/lib/vehicles/showroom-hero-kind";
import { showroomHeroUsesSpatialParallax } from "@/lib/vehicles/showroom-hero-kind";

const PARALLAX_PX = 140;
const TWO_LAYER_FACTORS = { bg: 0.15, fg: 0.45 };
const THREE_LAYER_FACTORS = [0.12, 0.28, 0.48];

type ShowroomSpatialSceneProps = {
  heroImageSrc: string;
  heroKind: ShowroomHeroKind;
  heroImageClass: string;
  spatialLayerUrls: string[] | null;
  parallaxEnabled: boolean;
  scrollYProgress: MotionValue<number>;
  visiblePhotosCount: number;
  title: string;
  onOpenGallery: () => void;
};

function SpatialImageLayer({
  src,
  className,
  y,
  priority = false,
}: {
  src: string;
  className: string;
  y?: MotionValue<number>;
  priority?: boolean;
}) {
  const image = (
    <Image
      src={src}
      alt=""
      fill
      priority={priority}
      unoptimized
      className={className}
      sizes="100vw"
    />
  );

  if (!y) {
    return <div className="absolute inset-0">{image}</div>;
  }

  return (
    <motion.div className="absolute inset-0 will-change-transform" style={{ y }}>
      {image}
    </motion.div>
  );
}

export function ShowroomSpatialScene({
  heroImageSrc,
  heroKind,
  heroImageClass,
  spatialLayerUrls,
  parallaxEnabled,
  scrollYProgress,
  visiblePhotosCount,
  title,
  onOpenGallery,
}: ShowroomSpatialSceneProps) {
  const usesParallax =
    parallaxEnabled && showroomHeroUsesSpatialParallax(heroKind);
  const hasStoredLayers =
    spatialLayerUrls != null && spatialLayerUrls.length === 3;

  const bgY = useTransform(scrollYProgress, [0, 1], [
    0,
    -PARALLAX_PX * TWO_LAYER_FACTORS.bg,
  ]);
  const fgY = useTransform(scrollYProgress, [0, 1], [
    0,
    -PARALLAX_PX * TWO_LAYER_FACTORS.fg,
  ]);
  const layer0Y = useTransform(scrollYProgress, [0, 1], [
    0,
    -PARALLAX_PX * THREE_LAYER_FACTORS[0],
  ]);
  const layer1Y = useTransform(scrollYProgress, [0, 1], [
    0,
    -PARALLAX_PX * THREE_LAYER_FACTORS[1],
  ]);
  const layer2Y = useTransform(scrollYProgress, [0, 1], [
    0,
    -PARALLAX_PX * THREE_LAYER_FACTORS[2],
  ]);

  const expandControl =
    visiblePhotosCount > 0 ? (
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[38%] right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white/90 backdrop-blur-sm"
      >
        <Expand className="h-4 w-4" />
      </span>
    ) : null;

  const gradient = (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[42%] bg-gradient-to-t from-black via-black/55 to-transparent"
      aria-hidden
    />
  );

  const studioPlate = (
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(40,40,48,0.55),rgba(0,0,0,0.95)_68%)]"
      aria-hidden
    />
  );

  if (!usesParallax) {
    return (
      <div className="absolute inset-0 bg-black" aria-hidden>
        {studioPlate}
        <button
          type="button"
          onClick={onOpenGallery}
          disabled={visiblePhotosCount === 0}
          className="relative block h-full w-full disabled:cursor-default"
          aria-label={`${title || "Fahrzeugfoto"} in Galerie öffnen`}
        >
          <Image
            src={heroImageSrc}
            alt=""
            fill
            priority
            unoptimized
            className={heroImageClass}
            sizes="100vw"
          />
          {expandControl}
        </button>
        {gradient}
      </div>
    );
  }

  if (hasStoredLayers && spatialLayerUrls) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden>
        {studioPlate}
        <button
          type="button"
          onClick={onOpenGallery}
          disabled={visiblePhotosCount === 0}
          className="relative block h-full w-full disabled:cursor-default"
          aria-label={`${title || "Fahrzeugfoto"} in Galerie öffnen`}
        >
          <SpatialImageLayer
            src={spatialLayerUrls[0]}
            className={`${heroImageClass} opacity-90`}
            y={layer0Y}
          />
          <SpatialImageLayer
            src={spatialLayerUrls[1]}
            className={heroImageClass}
            y={layer1Y}
          />
          <SpatialImageLayer
            src={spatialLayerUrls[2]}
            className={heroImageClass}
            y={layer2Y}
            priority
          />
          {expandControl}
        </button>
        {gradient}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden>
      {studioPlate}
      <button
        type="button"
        onClick={onOpenGallery}
        disabled={visiblePhotosCount === 0}
        className="relative block h-full w-full disabled:cursor-default"
        aria-label={`${title || "Fahrzeugfoto"} in Galerie öffnen`}
      >
        <SpatialImageLayer
          src={heroImageSrc}
          className={`${heroImageClass} scale-110 blur-2xl brightness-[0.45] saturate-125`}
          y={bgY}
        />
        <SpatialImageLayer
          src={heroImageSrc}
          className={heroImageClass}
          y={fgY}
          priority
        />
        {expandControl}
      </button>
      {gradient}
    </div>
  );
}
