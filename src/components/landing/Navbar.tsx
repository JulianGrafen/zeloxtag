"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { ZeloxBrandWordmark } from "@/components/brand/zelox-brand-wordmark";
import {
  LANDING_LOGIN_HREF,
  LANDING_SHOP_HREF,
  landingNav,
} from "@/data/landingContent";

import { LandingCtaLink } from "./LandingCtaLink";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#07080C]/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 sm:h-16 sm:px-8">
        <Link
          href="/"
          className="shrink-0 text-white"
          onClick={() => setOpen(false)}
        >
          <ZeloxBrandWordmark
            size="compact"
            className="text-[1.05rem] tracking-[0.28em] text-white sm:text-[1.12rem]"
          />
        </Link>

        <nav
          className="hidden items-center gap-6 lg:flex"
          aria-label="Landing"
        >
          {landingNav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[0.82rem] text-white/55 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 sm:flex">
          <LandingCtaLink href={LANDING_LOGIN_HREF} variant="quiet">
            {landingNav.loginCta}
          </LandingCtaLink>
          <LandingCtaLink href={LANDING_SHOP_HREF} variant="primary">
            {landingNav.shopCta}
          </LandingCtaLink>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white lg:hidden"
          aria-expanded={open}
          aria-label={open ? landingNav.menuCloseLabel : landingNav.menuOpenLabel}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? (
            <X className="h-4 w-4" aria-hidden />
          ) : (
            <Menu className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      <div
        hidden={!open}
        className="border-t border-white/5 bg-[#07080C]/95 px-5 py-4 lg:hidden"
      >
        <nav className="flex flex-col gap-1" aria-label="Landing mobil">
          {landingNav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center text-[0.92rem] text-white/75"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mt-3 flex flex-col gap-2 sm:hidden">
          <LandingCtaLink href={LANDING_LOGIN_HREF} variant="quiet">
            {landingNav.loginCta}
          </LandingCtaLink>
          <LandingCtaLink
            href={LANDING_SHOP_HREF}
            variant="primary"
            className="w-full"
          >
            {landingNav.shopCta}
          </LandingCtaLink>
        </div>
      </div>
    </header>
  );
}
