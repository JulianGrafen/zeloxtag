import Link from "next/link";

import { ZeloxBrandWordmark } from "@/components/brand/zelox-brand-wordmark";

export async function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--vd-border)] bg-[color:var(--vd-bg)]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-3 px-4 sm:px-5">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--vd-border)]"
        >
          <ZeloxBrandWordmark size="compact" />
        </Link>
      </div>
    </header>
  );
}
