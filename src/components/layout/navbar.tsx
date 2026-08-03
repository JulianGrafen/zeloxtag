import Link from "next/link";
import { QrCode, Tag } from "lucide-react";

import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--vd-border)] bg-[color:var(--vd-bg)]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-3 px-4 sm:px-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white">
            <Tag className="h-4 w-4" aria-hidden />
          </span>
          ZeloxTag
        </Link>

        <nav className="flex items-center gap-1 text-[0.78rem] font-medium text-[color:var(--vd-muted)]">
          <Link
            href="/qr"
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-neutral-900/5 hover:text-[color:var(--vd-text)]"
          >
            QR
          </Link>
          <Link
            href={`/v/${MOCK_TAG_UUIDS.active}?scan=1`}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-white transition-transform active:scale-95"
          >
            <QrCode className="h-3.5 w-3.5" aria-hidden />
            Scanner
          </Link>
        </nav>
      </div>
    </header>
  );
}
