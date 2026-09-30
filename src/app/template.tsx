"use client";

import { Suspense } from "react";

import { PageTransition } from "@/components/vehicle-dashboard/PageTransition";

export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={children}>
      <PageTransition>{children}</PageTransition>
    </Suspense>
  );
}
