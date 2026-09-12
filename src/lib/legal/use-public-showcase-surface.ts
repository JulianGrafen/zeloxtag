"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function readPublicShowcaseFlag(): boolean {
  return document.documentElement.dataset.publicShowcase === "1";
}

/** True while the public showroom surface is mounted (guest /v/{tag} showcase). */
export function usePublicShowcaseSurface(): boolean {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setActive(readPublicShowcaseFlag());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-public-showcase"],
    });

    return () => observer.disconnect();
  }, [pathname]);

  return active;
}
