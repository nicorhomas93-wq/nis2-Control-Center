"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  BUSINESS_CRITICALITY_OPTIONS,
  PROCESSED_DATA_OPTIONS,
  INFRASTRUCTURE_OPTIONS,
  calculateCriticalityScores,
  getCriticalityLevelColor,
  getCriticalityLevelLabel,
  type BusinessCriticalityType,
  type InfrastructureType,
  type ProcessedDataType,
} from "@/lib/nis2/criticality-assessment";

interface CriticalityAssessmentCardProps {
  businessTypes: BusinessCriticalityType[];
  dataTypes: ProcessedDataType[];
  infrastructureTypes: InfrastructureType[];
  onBusinessChange: (types: BusinessCriticalityType[]) => void;
  onDataChange: (types: ProcessedDataType[]) => void;
  onInfrastructureChange: (types: InfrastructureType[]) => void;
}

function toggleItem<T extends string>(current: T[], id: T): T[] {
  return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
}

function OptionGroup<T extends string>({
  title,
  description,
  options,
  selected,
  onChange,
}: {
  title: string;
  description: string;
  options: { id: T; label: string; points: number }[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div>
        <h3 className="font-medium text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
              selected.includes(option.id)
                ? "border-brand-300 bg-brand-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={selected.includes(option.id)}
              onChange={() => onChange(toggleItem(selected, option.id))}
            />
            <span>
              <span className="font-medium text-slate-800">{option.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{option.points} Punkte</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function CriticalityAssessmentCard({
  businessTypes,
  dataTypes,
  infrastructureTypes,
  onBusinessChange,
  onDataChange,
  onInfrastructureChange,
}: CriticalityAssessmentCardProps) {
  const scores = calculateCriticalityScores({
    business_criticality_types: businessTypes,
    processed_data_types: dataTypes,
    infrastructure_types: infrastructureTypes,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Kritikalitätsbewertung</CardTitle>
            <CardDescription className="mt-1">
              Bewertung der geschäftlichen und technischen Kritikalität des Unternehmens zur automatisierten
              Risiko- und Compliance-Einstufung nach NIS2-, ISO-27001- und BSI-Grundschutz-Prinzipien.
            </CardDescription>
          </div>
          {scores.level !== "unbekannt" && (
            <Badge className={getCriticalityLevelColor(scores.level)}>
              {getCriticalityLevelLabel(scores.level)} · {scores.total} Punkte
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <OptionGroup
          title="Geschäftskritikalität"
          description="Welche Prozessarten sind für den Fortbestand und die Sicherheit Ihres Unternehmens besonders relevant?"
          options={BUSINESS_CRITICALITY_OPTIONS}
          selected={businessTypes}
          onChange={onBusinessChange}
        />

        <OptionGroup
          title="Verarbeitete Daten"
          description="Welche Datenarten verarbeitet Ihr Unternehmen? Die Auswahl fließt in Datenschutz-, Risiko- und Nachweisanforderungen ein."
          options={PROCESSED_DATA_OPTIONS}
          selected={dataTypes}
          onChange={onDataChange}
        />

        <OptionGroup
          title="Infrastruktur"
          description="Welche technischen Betriebsmodelle und Zugangswege nutzen Sie? Relevant für Schutzbedarf und Maßnahmenplanung."
          options={INFRASTRUCTURE_OPTIONS}
          selected={infrastructureTypes}
          onChange={onInfrastructureChange}
        />

        {scores.level !== "unbekannt" && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Automatische Auswertung</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <p>Geschäft: <strong>{scores.business}</strong> Punkte</p>
              <p>Daten: <strong>{scores.data}</strong> Punkte</p>
              <p>Infrastruktur: <strong>{scores.infrastructure}</strong> Punkte</p>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Die Bewertung fließt automatisch in Betroffenheitsprüfung, Risiko-Scoring, Compliance-Score,
              Dashboard und Maßnahmenplanung ein.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
