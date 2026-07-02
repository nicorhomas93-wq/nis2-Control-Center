"use client";

import { Label } from "@/components/ui/Label";

export interface EvidenceLinkOption {
  id: string;
  label: string;
}

export interface EvidenceLinkOptions {
  risks: EvidenceLinkOption[];
  measures: EvidenceLinkOption[];
  tasks: EvidenceLinkOption[];
  incidents: EvidenceLinkOption[];
  vendors: EvidenceLinkOption[];
  auditAreas: EvidenceLinkOption[];
}

interface EvidenceLinkFieldsProps {
  value: {
    linkedRiskIds: string[];
    linkedMeasureIds: string[];
    linkedTaskIds: string[];
    linkedIncidentIds: string[];
    linkedVendorIds: string[];
    linkedAuditAreas: string[];
  };
  options: EvidenceLinkOptions;
  onChange: (next: EvidenceLinkFieldsProps["value"]) => void;
}

function MultiSelect({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: EvidenceLinkOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 max-h-32 space-y-1 overflow-auto rounded-lg border border-slate-200 p-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => onToggle(item.id)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function EvidenceLinkFields({ value, options, onChange }: EvidenceLinkFieldsProps) {
  function toggle(
    field: keyof EvidenceLinkFieldsProps["value"],
    id: string
  ) {
    const current = value[field];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange({ ...value, [field]: next });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <MultiSelect
        label="Verknüpfte Risiken"
        items={options.risks}
        selected={value.linkedRiskIds}
        onToggle={(id) => toggle("linkedRiskIds", id)}
      />
      <MultiSelect
        label="Verknüpfte Maßnahmen"
        items={options.measures}
        selected={value.linkedMeasureIds}
        onToggle={(id) => toggle("linkedMeasureIds", id)}
      />
      <MultiSelect
        label="Verknüpfte Aufgaben"
        items={options.tasks}
        selected={value.linkedTaskIds}
        onToggle={(id) => toggle("linkedTaskIds", id)}
      />
      <MultiSelect
        label="Verknüpfte Incidents"
        items={options.incidents}
        selected={value.linkedIncidentIds}
        onToggle={(id) => toggle("linkedIncidentIds", id)}
      />
      <MultiSelect
        label="Verknüpfte Lieferanten"
        items={options.vendors}
        selected={value.linkedVendorIds}
        onToggle={(id) => toggle("linkedVendorIds", id)}
      />
      <MultiSelect
        label="Verknüpfte Audit-Bereiche"
        items={options.auditAreas}
        selected={value.linkedAuditAreas}
        onToggle={(id) => toggle("linkedAuditAreas", id)}
      />
    </div>
  );
}
