"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getOrCreateVisitorId, parseUtmFromUrl, trackAcquisition } from "@/lib/acquisition/client";

const TRACKED_PREFIXES = ["/", "/check", "/result", "/upgrade", "/demo", "/pricing", "/success"];

function shouldTrack(pathname: string): boolean {
  return TRACKED_PREFIXES.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p))
  );
}

export function AcquisitionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldTrack(pathname)) return;

    getOrCreateVisitorId();
    const utm = parseUtmFromUrl();
    if (utm.utm_source) {
      localStorage.setItem("tknd_utm", JSON.stringify(utm));
    }

    void trackAcquisition("page_view", { pagePath: pathname });

    const onLeave = () => {
      void trackAcquisition("page_leave", { pagePath: pathname });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onLeave();
    };

    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("beforeunload", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  return null;
}
