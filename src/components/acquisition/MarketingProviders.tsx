"use client";

import { AcquisitionTracker } from "@/components/acquisition/AcquisitionTracker";

export function MarketingProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AcquisitionTracker />
      {children}
    </>
  );
}
