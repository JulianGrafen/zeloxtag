"use client";

import { useEffect } from "react";

/** Marks the document so global chrome (e.g. duplicate legal footer) can step aside. */
export function PublicShowcaseMarker() {
  useEffect(() => {
    document.documentElement.dataset.publicShowcase = "1";
    return () => {
      delete document.documentElement.dataset.publicShowcase;
    };
  }, []);

  return null;
}
