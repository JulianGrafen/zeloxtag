"use client";

import { useEffect } from "react";

export function LandingScrollSmooth() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("scroll-smooth");
    return () => {
      root.classList.remove("scroll-smooth");
    };
  }, []);

  return null;
}
