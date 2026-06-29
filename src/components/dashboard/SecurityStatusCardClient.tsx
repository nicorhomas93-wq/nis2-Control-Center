"use client";

import { useCallback, useEffect, useState } from "react";
import { SecurityStatusCard } from "@/components/dashboard/SecurityStatusCard";
import { COMPLIANCE_UPDATED_EVENT } from "@/lib/compliance/client-sync";
import type {
  AuditReadinessResult,
  ScoreDriver,
  SecurityLevel,
  SecurityScoreSnapshot,
  SecurityStatusResult,
} from "@/lib/compliance/types";

interface SecurityStatusCardClientProps {
  companyId: string;
  score: number;
  level: SecurityLevel;
  summary: string;
  drivers: ScoreDriver[];
  auditReadiness: AuditReadinessResult;
  history: SecurityScoreSnapshot[];
}

export function SecurityStatusCardClient({
  companyId,
  score: initialScore,
  level: initialLevel,
  summary: initialSummary,
  drivers: initialDrivers,
  auditReadiness: initialAuditReadiness,
  history: initialHistory,
}: SecurityStatusCardClientProps) {
  const [score, setScore] = useState(initialScore);
  const [level, setLevel] = useState(initialLevel);
  const [summary, setSummary] = useState(initialSummary);
  const [drivers, setDrivers] = useState(initialDrivers);
  const [auditReadiness, setAuditReadiness] = useState(initialAuditReadiness);
  const [history, setHistory] = useState(initialHistory);

  const applyStatus = useCallback((status: SecurityStatusResult, nextHistory?: SecurityScoreSnapshot[]) => {
    setScore(status.score);
    setLevel(status.level);
    setSummary(status.summary);
    setDrivers(status.drivers);
    setAuditReadiness(status.auditReadiness);
    if (nextHistory) setHistory(nextHistory);
  }, []);

  useEffect(() => {
    function onComplianceUpdated(event: Event) {
      const detail = (event as CustomEvent<{ companyId: string; securityStatus: SecurityStatusResult }>).detail;
      if (!detail || detail.companyId !== companyId) return;
      applyStatus(detail.securityStatus);
    }

    window.addEventListener(COMPLIANCE_UPDATED_EVENT, onComplianceUpdated);
    return () => window.removeEventListener(COMPLIANCE_UPDATED_EVENT, onComplianceUpdated);
  }, [applyStatus, companyId]);

  const refreshStatus = useCallback(async () => {
    const res = await fetch(`/api/compliance/status?companyId=${companyId}`);
    const data = await res.json();
    if (!res.ok) return;
    applyStatus(data.securityStatus as SecurityStatusResult, data.history as SecurityScoreSnapshot[]);
  }, [applyStatus, companyId]);

  useEffect(() => {
    function onFocus() {
      refreshStatus();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshStatus]);

  return (
    <SecurityStatusCard
      score={score}
      level={level}
      summary={summary}
      drivers={drivers}
      auditReadiness={auditReadiness}
      history={history}
    />
  );
}
