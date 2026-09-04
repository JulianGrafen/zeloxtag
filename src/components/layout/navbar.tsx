import Link from "next/link";
import { Tag } from "lucide-react";

export async function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--vd-border)] bg-[color:var(--vd-bg)]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-3 px-4 sm:px-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]"
        >
          <span className="vd-icon-badge h-8 w-8 rounded-xl">
            <Tag className="h-4 w-4" aria-hidden />
          </span>
          ZeloxTag
        </Link>
      </div>
    </header>
  );
}
