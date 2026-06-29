"use client";

import { useState } from "react";
import type { AssetCategory, AssetCriticality, CompanyAsset } from "@/lib/assets/types";
import { ASSET_CATEGORY_LABELS, ASSET_CRITICALITY_LABELS } from "@/lib/assets/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

interface AssetPickerProps {
  companyId: string;
  assets: CompanyAsset[];
  value: string | null;
  onChange: (assetId: string | null, asset: CompanyAsset | null) => void;
  onAssetsChange?: (assets: CompanyAsset[]) => void;
}

export function AssetPicker({
  companyId,
  assets,
  value,
  onChange,
  onAssetsChange,
}: AssetPickerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<AssetCategory>("it_systems");
  const [newCriticality, setNewCriticality] = useState<AssetCriticality>("medium");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createAsset() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);

    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        name: newName.trim(),
        category: newCategory,
        criticality: newCriticality,
        description: newDescription || null,
      }),
    });

    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(data.error ?? "Asset konnte nicht angelegt werden");
      return;
    }

    const asset = data.asset as CompanyAsset;
    onAssetsChange?.([...assets, asset]);
    onChange(asset.id, asset);
    setShowCreate(false);
    setNewName("");
    setNewDescription("");
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="asset-select">Asset</Label>
        <Select
          id="asset-select"
          value={value ?? ""}
          onChange={(e) => {
            const id = e.target.value || null;
            const asset = assets.find((a) => a.id === id) ?? null;
            onChange(id, asset);
          }}
        >
          <option value="">Bitte wählen…</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({ASSET_CATEGORY_LABELS[a.category]})
            </option>
          ))}
        </Select>
      </div>

      {!showCreate ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setShowCreate(true)}>
          Eigenes Asset anlegen
        </Button>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">Neues Asset</p>
          <div>
            <Label>Name (Pflicht)</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Kategorie (Pflicht)</Label>
              <Select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as AssetCategory)}
              >
                {(Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {ASSET_CATEGORY_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Kritikalität</Label>
              <Select
                value={newCriticality}
                onChange={(e) => setNewCriticality(e.target.value as AssetCriticality)}
              >
                {(Object.keys(ASSET_CRITICALITY_LABELS) as AssetCriticality[]).map((key) => (
                  <option key={key} value={key}>
                    {ASSET_CRITICALITY_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={createAsset} disabled={creating || !newName.trim()}>
              {creating ? "Speichern…" : "Asset speichern"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowCreate(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
