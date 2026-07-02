"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SendCustomerMessageButton } from "@/components/jarvis/customer-message/SendCustomerMessageButton";
import { AUTOMATION_TRIGGER_LABELS } from "@/lib/jarvis/customer-message/automation-triggers";
import type { CustomerMessage, CustomerMessageTarget } from "@/lib/jarvis/customer-message/types";
import { formatDate } from "@/lib/utils";

interface CustomerMessageSectionProps {
  target: CustomerMessageTarget;
  compact?: boolean;
}

export function CustomerMessageSection({ target, compact }: CustomerMessageSectionProps) {
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [profile, setProfile] = useState<{
    riskScore: number;
    documentMissing: boolean;
    auditIncomplete: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showHistory, setShowHistory] = useState(!compact);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        entityType: target.entityType,
        entityId: target.entityId,
      });
      const res = await fetch(`/api/jarvis/customer-messages?${params}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages ?? []);
        setAutoEnabled(Boolean(data.autoEnabled));
        setProfile(data.profile ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [target.entityType, target.entityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(enabled: boolean) {
    setToggling(true);
    try {
      const res = await fetch("/api/jarvis/customer-messages/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: target.entityType,
          entityId: target.entityId,
          autoEnabled: enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
      setAutoEnabled(enabled);
      await load();
    } catch {
      // revert on error
      setAutoEnabled(!enabled);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <SendCustomerMessageButton target={target} onSent={load} />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={autoEnabled}
            disabled={toggling}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          {toggling ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            "Automatische Nachrichten"
          )}
        </label>
        {compact && (
          <button
            type="button"
            className="text-xs text-brand-600 hover:underline"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? "Verlauf ausblenden" : `Verlauf (${messages.length})`}
          </button>
        )}
      </div>

      {profile && autoEnabled && (
        <p className="text-xs text-slate-500">
          Profil: Risiko {profile.riskScore}/100
          {profile.documentMissing ? " · Dokumente fehlen" : ""}
          {profile.auditIncomplete ? " · Audit unvollständig" : ""}
        </p>
      )}

      {showHistory && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nachrichten (manuell + automatisch)
          </p>
          {loading ? (
            <p className="text-xs text-slate-400">Laden…</p>
          ) : messages.length === 0 ? (
            <p className="text-xs text-slate-400">Noch keine Nachrichten.</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className="rounded border border-white bg-white p-2 text-slate-600"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {msg.source === "automatic" ? "Auto" : "Manuell"}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span>{msg.channel}</span>
                    <span className="text-slate-400">·</span>
                    <span>
                      {msg.status === "sent"
                        ? "versendet"
                        : msg.status === "failed"
                          ? "fehlgeschlagen"
                          : "gespeichert"}
                    </span>
                    {msg.trigger_type && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span>{AUTOMATION_TRIGGER_LABELS[msg.trigger_type]}</span>
                      </>
                    )}
                    <span className="text-slate-400">·</span>
                    <span>{formatDate(msg.created_at)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap">{msg.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
