"use client";

import { PageTransition } from "@/components/vehicle-dashboard/PageTransition";

export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}
