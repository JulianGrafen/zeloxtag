import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/LandingPage";
import { pageSocialMetadata } from "@/lib/seo/open-graph";

export const metadata: Metadata = {
  title: "ZeloxTag – Digitale Fahrzeughistorie in V4A-Edelstahl",
  description:
    "Lasergraviertes V4A-Typenschild am Schlossträger, verbunden mit einer digitalen Fahrzeugakte. Lückenloser Werterhalt, Car-Meets ohne App-Zwang.",
  ...pageSocialMetadata({
    title: "ZeloxTag – Digitale Fahrzeughistorie in V4A-Edelstahl",
    description:
      "Lasergraviertes V4A-Typenschild am Schlossträger, verbunden mit einer digitalen Fahrzeugakte.",
    path: "/",
  }),
};

interface HomePageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
    recovered?: string;
    tab?: string;
  }>;
}

function legacyLoginQuery(params: {
  next?: string;
  error?: string;
  recovered?: string;
  tab?: string;
}): string | null {
  const query = new URLSearchParams();
  if (params.next) query.set("next", params.next);
  if (params.error) query.set("error", params.error);
  if (params.recovered) query.set("recovered", params.recovered);
  if (params.tab) query.set("tab", params.tab);
  const encoded = query.toString();
  return encoded ? encoded : null;
}

/**
 * Public brand landing. Legacy `/?next=` login bookmarks continue to `/login`.
 */
export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const legacyQuery = legacyLoginQuery(params);
  if (legacyQuery) {
    redirect(`/login?${legacyQuery}`);
  }

  return <LandingPage />;
}
