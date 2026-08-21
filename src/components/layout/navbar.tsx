import Link from "next/link";
import { QrCode, Tag } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-user";
import { isOperatorEmail } from "@/lib/auth/require-operator";

export async function Navbar() {
  const user = await getCurrentUser();
  const superuser = isOperatorEmail(user?.email);

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

        <nav className="flex items-center gap-1 text-[0.78rem] font-medium text-[color:var(--vd-muted)]">
          {superuser ? (
            <Link
              href="/qr"
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-black/[0.04] hover:text-[color:var(--vd-text)]"
            >
              Mint
            </Link>
          ) : null}
          <Link
            href="/demo"
            className="claim-cta-sm !w-auto px-3 py-1.5 no-underline"
          >
            <QrCode className="h-3.5 w-3.5" aria-hidden />
            Demo
          </Link>
        </nav>
      </div>
    </header>
  );
}
