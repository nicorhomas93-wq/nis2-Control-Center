import { AlertTriangle } from "lucide-react";
import { DB_SETUP_HINT } from "@/lib/supabase/db-error";

export function SupabaseSetupBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Datenbank-Setup erforderlich</p>
        <p className="mt-1 text-amber-800">
          Die Supabase-Tabellen fehlen noch oder das Schema ist veraltet. Öffnen Sie den{" "}
          <a
            href="https://supabase.com/dashboard/project/hmyeguskotcydmodoedr/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            Supabase SQL Editor
          </a>{" "}
          und führen Sie aus:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-amber-800">
          <li>
            Neuinstallation:{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
              supabase/setup-complete.sql
            </code>
          </li>
          <li>
            Bestehende DB patchen:{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
              supabase/migrations/patch-existing-db.sql
            </code>
          </li>
        </ul>
        <p className="mt-2 text-xs text-amber-700">{DB_SETUP_HINT}</p>
      </div>
    </div>
  );
}
