"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CompanyFormData } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { CriticalityAssessmentCard } from "@/components/forms/CriticalityAssessmentCard";
import { calculateCriticalityScores } from "@/lib/nis2/criticality-assessment";
import type {
  BusinessCriticalityType,
  InfrastructureType,
  ProcessedDataType,
} from "@/lib/nis2/criticality-assessment";
import { DB_SETUP_HINT } from "@/lib/supabase/db-error";

const INDUSTRIES = [
  "Energie", "Transport & Logistik", "Gesundheitswesen", "Finanzdienstleistungen",
  "ICT-Dienstleistungen", "Produktion / Verarbeitendes Gewerbe", "Digitale Dienste",
  "Öffentliche Verwaltung", "Handel", "Beratung", "Sonstige",
];

const defaultForm: CompanyFormData = {
  company_name: "", industry: "", employee_count: null, annual_revenue: null,
  balance_sheet_total: null, country: "DE", eu_operations: false,
  uses_microsoft_365: false, uses_cloud_services: false, critical_business_processes: "",
  has_it_service_provider: false, publicly_accessible_systems: false,
  security_contact_name: "", security_contact_email: "",
  business_criticality_types: [], processed_data_types: [], infrastructure_types: [],
};

interface CompanyProfileFormProps {
  initialData?: Partial<CompanyFormData>;
  companyId: string;
}

export function CompanyProfileForm({ initialData, companyId }: CompanyProfileFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<CompanyFormData>({ ...defaultForm, ...initialData });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function updateField<K extends keyof CompanyFormData>(key: K, value: CompanyFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const criticality = calculateCriticalityScores({
      business_criticality_types: form.business_criticality_types as BusinessCriticalityType[],
      processed_data_types: form.processed_data_types as ProcessedDataType[],
      infrastructure_types: form.infrastructure_types as InfrastructureType[],
    });

    const { error } = await supabase.from("companies").update({
      company_name: form.company_name,
      industry: form.industry,
      employee_count: form.employee_count,
      annual_revenue: form.annual_revenue,
      balance_sheet_total: form.balance_sheet_total,
      country: form.country,
      eu_operations: form.eu_operations,
      uses_microsoft_365: form.uses_microsoft_365,
      uses_cloud_services: form.uses_cloud_services,
      critical_business_processes: form.critical_business_processes,
      has_it_service_provider: form.has_it_service_provider,
      publicly_accessible_systems: form.publicly_accessible_systems,
      security_contact_name: form.security_contact_name,
      security_contact_email: form.security_contact_email,
      business_criticality_types: form.business_criticality_types,
      processed_data_types: form.processed_data_types,
      infrastructure_types: form.infrastructure_types,
      business_criticality_score: criticality.business,
      data_criticality_score: criticality.data,
      infrastructure_criticality_score: criticality.infrastructure,
      criticality_score: criticality.total,
      criticality_level: criticality.level,
    }).eq("id", companyId);

    if (error) {
      const text = error.message?.includes("does not exist") || error.code === "PGRST205"
        ? `Datenbanktabellen fehlen. ${DB_SETUP_HINT}`
        : "Speichern fehlgeschlagen. Bitte erneut versuchen.";
      setMessage({ type: "error", text });
      setSaving(false);
      return;
    }

    setMessage({ type: "success", text: "Unternehmensprofil erfolgreich gespeichert." });
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Allgemeine Unternehmensdaten</CardTitle>
          <CardDescription>Grundlegende Informationen für die NIS2-Betroffenheitsprüfung.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="company_name">Unternehmensname</Label>
            <Input id="company_name" value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="industry">Branche</Label>
            <Select id="industry" value={form.industry} onChange={(e) => updateField("industry", e.target.value)} required>
              <option value="">Bitte wählen</option>
              {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="employee_count">Mitarbeiterzahl</Label>
            <Input id="employee_count" type="number" min={1} value={form.employee_count ?? ""} onChange={(e) => updateField("employee_count", e.target.value ? parseInt(e.target.value) : null)} />
          </div>
          <div>
            <Label htmlFor="annual_revenue">Jahresumsatz (EUR)</Label>
            <Input id="annual_revenue" type="number" min={0} value={form.annual_revenue ?? ""} onChange={(e) => updateField("annual_revenue", e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
          <div>
            <Label htmlFor="balance_sheet_total">Bilanzsumme (EUR)</Label>
            <Input id="balance_sheet_total" type="number" min={0} value={form.balance_sheet_total ?? ""} onChange={(e) => updateField("balance_sheet_total", e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
          <div>
            <Label htmlFor="country">Land</Label>
            <Select id="country" value={form.country} onChange={(e) => updateField("country", e.target.value)}>
              <option value="DE">Deutschland</option>
              <option value="AT">Österreich</option>
              <option value="CH">Schweiz</option>
              <option value="EU">Anderes EU-Land</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>IT- und Geschäftsumfeld</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Checkbox id="eu_operations" label="EU-weit tätig" checked={form.eu_operations} onChange={(e) => updateField("eu_operations", e.target.checked)} />
            <Checkbox id="uses_microsoft_365" label="Microsoft 365 Nutzung" checked={form.uses_microsoft_365} onChange={(e) => updateField("uses_microsoft_365", e.target.checked)} />
            <Checkbox id="uses_cloud_services" label="Cloud-Dienste" checked={form.uses_cloud_services} onChange={(e) => updateField("uses_cloud_services", e.target.checked)} />
            <Checkbox id="has_it_service_provider" label="IT-Dienstleister vorhanden" checked={form.has_it_service_provider} onChange={(e) => updateField("has_it_service_provider", e.target.checked)} />
            <Checkbox id="publicly_accessible_systems" label="Öffentlich erreichbare Systeme" checked={form.publicly_accessible_systems} onChange={(e) => updateField("publicly_accessible_systems", e.target.checked)} />
          </div>
          <div>
            <Label htmlFor="critical_business_processes">Kritische Geschäftsprozesse</Label>
            <Textarea id="critical_business_processes" value={form.critical_business_processes} onChange={(e) => updateField("critical_business_processes", e.target.value)} placeholder="z. B. Produktionssteuerung, ERP, Kundenportale" />
          </div>
        </CardContent>
      </Card>

      <CriticalityAssessmentCard
        businessTypes={form.business_criticality_types as BusinessCriticalityType[]}
        dataTypes={form.processed_data_types as ProcessedDataType[]}
        infrastructureTypes={form.infrastructure_types as InfrastructureType[]}
        onBusinessChange={(types) => updateField("business_criticality_types", types)}
        onDataChange={(types) => updateField("processed_data_types", types)}
        onInfrastructureChange={(types) => updateField("infrastructure_types", types)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Ansprechpartner Informationssicherheit</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="security_contact_name">Name</Label>
            <Input id="security_contact_name" value={form.security_contact_name} onChange={(e) => updateField("security_contact_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="security_contact_email">E-Mail</Label>
            <Input id="security_contact_email" type="email" value={form.security_contact_email} onChange={(e) => updateField("security_contact_email", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {message && (
        <p className={`rounded-lg px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>{saving ? "Wird gespeichert..." : "Profil speichern"}</Button>
      </div>
    </form>
  );
}
