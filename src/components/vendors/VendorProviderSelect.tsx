"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  CUSTOM_PROVIDER_KEY,
  KNOWN_PROVIDER_PROFILES,
  type KnownProviderProfile,
  searchKnownProviders,
} from "@/lib/vendors/provider-catalog";

export interface ProviderSelection {
  providerKey: string | null;
  name: string;
  isCustom: boolean;
  profile: KnownProviderProfile | null;
}

interface VendorProviderSelectProps {
  value: string;
  providerKey: string | null;
  onChange: (selection: ProviderSelection) => void;
  disabled?: boolean;
}

export function VendorProviderSelect({
  value,
  providerKey,
  onChange,
  disabled,
}: VendorProviderSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => searchKnownProviders(query), [query]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectProfile(profile: KnownProviderProfile) {
    setQuery(profile.name);
    setOpen(false);
    onChange({
      providerKey: profile.key,
      name: profile.name,
      isCustom: false,
      profile,
    });
  }

  function selectCustom(name: string) {
    setQuery(name);
    setOpen(false);
    onChange({
      providerKey: null,
      name,
      isCustom: true,
      profile: null,
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <Label htmlFor="vendor-provider">Anbieter</Label>
      <Input
        id="vendor-provider"
        value={query}
        disabled={disabled}
        placeholder="z. B. Microsoft 365, AWS, IONOS …"
        autoComplete="off"
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          if (!next.trim()) {
            onChange({ providerKey: null, name: "", isCustom: true, profile: null });
            return;
          }
          const exact = KNOWN_PROVIDER_PROFILES.find(
            (p) => p.name.toLowerCase() === next.trim().toLowerCase()
          );
          if (exact) {
            onChange({
              providerKey: exact.key,
              name: exact.name,
              isCustom: false,
              profile: exact,
            });
          } else if (providerKey && providerKey !== CUSTOM_PROVIDER_KEY) {
            onChange({
              providerKey: null,
              name: next,
              isCustom: true,
              profile: null,
            });
          } else {
            onChange({
              providerKey: null,
              name: next,
              isCustom: true,
              profile: null,
            });
          }
        }}
        onFocus={() => setOpen(true)}
      />
      {open && !disabled && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {suggestions.map((profile) => (
            <li key={profile.key}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => selectProfile(profile)}
              >
                <span className="font-medium">{profile.name}</span>
                <span className="ml-2 text-xs text-slate-500">{profile.category}</span>
              </button>
            </li>
          ))}
          {query.trim() &&
            !suggestions.some(
              (p) => p.name.toLowerCase() === query.trim().toLowerCase()
            ) && (
              <li>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-brand-700 hover:bg-brand-50"
                  onClick={() => selectCustom(query.trim())}
                >
                  Eigener Anbieter: „{query.trim()}“
                </button>
              </li>
            )}
        </ul>
      )}
      {providerKey && providerKey !== CUSTOM_PROVIDER_KEY && (
        <p className="mt-1 text-xs text-slate-500">Bekannter Anbieter — Standardbewertung verfügbar</p>
      )}
    </div>
  );
}
