"use client";

import { useCallback, useEffect, useState } from "react";
import { NextStepsCard } from "@/components/dashboard/NextStepsCard";
import { COMPLIANCE_UPDATED_EVENT } from "@/lib/compliance/client-sync";
import type { NextStepAction } from "@/lib/compliance/types";

interface NextStepsCardClientProps {
  companyId: string;
  initialSteps: NextStepAction[];
}

export function NextStepsCardClient({
  companyId,
  initialSteps,
}: NextStepsCardClientProps) {
  const [steps, setSteps] = useState(initialSteps);

  const applySteps = useCallback((next: NextStepAction[]) => {
    setSteps(next);
  }, []);

  useEffect(() => {
    function onComplianceUpdated(event: Event) {
      const detail = (event as CustomEvent<{
        companyId: string;
        nextSteps?: NextStepAction[];
      }>).detail;
      if (!detail || detail.companyId !== companyId) return;
      if (detail.nextSteps) applySteps(detail.nextSteps);
    }

    window.addEventListener(COMPLIANCE_UPDATED_EVENT, onComplianceUpdated);
    return () => window.removeEventListener(COMPLIANCE_UPDATED_EVENT, onComplianceUpdated);
  }, [applySteps, companyId]);

  const refreshSteps = useCallback(async () => {
    const res = await fetch(`/api/compliance/status?companyId=${companyId}`);
    const data = await res.json();
    if (!res.ok) return;
    if (data.nextSteps) applySteps(data.nextSteps as NextStepAction[]);
  }, [applySteps, companyId]);

  useEffect(() => {
    function onFocus() {
      refreshSteps();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshSteps]);

  return <NextStepsCard steps={steps} />;
}
