"use client";

import { useCallback, useEffect, useState } from "react";

import { toShareCardImageFetchUrl } from "@/lib/share/share-card-hero-image-url";
import { resolveVehicleCatalogImage } from "@/lib/vehicles/vehicle-image";

export function useSwipeHeroImage(
  initialSrc: string | null | undefined,
  make: string,
  model: string,
) {
  const [rawSrc, setRawSrc] = useState(() => initialSrc?.trim() ?? "");

  useEffect(() => {
    setRawSrc(initialSrc?.trim() ?? "");
  }, [initialSrc]);

  const onError = useCallback(() => {
    setRawSrc((current) => {
      const trimmed = current.trim();
      if (!trimmed) return "";
      if (trimmed.includes("/api/vehicle/catalog/")) return "";
      const catalog = resolveVehicleCatalogImage(make, model);
      if (catalog?.src && catalog.src !== trimmed) {
        return catalog.src;
      }
      return "";
    });
  }, [make, model]);

  const displaySrc = rawSrc ? toShareCardImageFetchUrl(rawSrc) : "";

  return { displaySrc, onError, hasImage: Boolean(displaySrc) };
}
