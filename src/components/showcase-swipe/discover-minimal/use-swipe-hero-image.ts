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
    const catalog = resolveVehicleCatalogImage(make, model);
    if (catalog?.src && catalog.src !== rawSrc) {
      setRawSrc(catalog.src);
      return;
    }
    setRawSrc("");
  }, [make, model, rawSrc]);

  const displaySrc = rawSrc ? toShareCardImageFetchUrl(rawSrc) : "";

  return { displaySrc, onError, hasImage: Boolean(displaySrc) };
}
