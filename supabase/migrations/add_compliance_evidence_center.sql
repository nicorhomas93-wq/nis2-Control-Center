-- Schulungs- & Nachweiscenter: erweiterte Felder, Status, Vorlagen

ALTER TABLE compliance_evidence_entries
  ADD COLUMN IF NOT EXISTS participants_target TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS participant_count INTEGER,
  ADD COLUMN IF NOT EXISTS review_interval TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS linked_incident_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS recommended_file_labels JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE compliance_evidence_entries DROP CONSTRAINT IF EXISTS compliance_evidence_entries_status_check;
ALTER TABLE compliance_evidence_entries
  ADD CONSTRAINT compliance_evidence_entries_status_check
  CHECK (
    status IN (
      'vollstaendig',
      'unvollstaendig',
      'nachweis_fehlt',
      'review_faellig',
      'abgelaufen',
      'freiwillig_dokumentiert',
      'freiwillig_empfohlen',
      'wartet_auf_nachweis',
      'nicht_zutreffend'
    )
  );

ALTER TABLE compliance_evidence_entries DROP CONSTRAINT IF EXISTS compliance_evidence_entries_mandatory_relevance_check;
ALTER TABLE compliance_evidence_entries
  ADD CONSTRAINT compliance_evidence_entries_mandatory_relevance_check
  CHECK (mandatory_relevance IN ('yes', 'no', 'nis2_dependent', 'not_applicable'));

ALTER TABLE compliance_evidence_entries DROP CONSTRAINT IF EXISTS compliance_evidence_entries_entry_type_check;
ALTER TABLE compliance_evidence_entries
  ADD CONSTRAINT compliance_evidence_entries_entry_type_check
  CHECK (
    entry_type IN (
      'schulung',
      'teilnahmebestaetigung',
      'phishing_auswertung',
      'mfa_nachweis',
      'zugriffskontroll_nachweis',
      'backup_nachweis',
      'incident_nachweis',
      'lieferanten_nachweis',
      'richtlinie',
      'audit_beleg',
      'sonstiges'
    )
  );

ALTER TABLE compliance_evidence_entries DROP CONSTRAINT IF EXISTS compliance_evidence_entries_review_interval_check;
ALTER TABLE compliance_evidence_entries
  ADD CONSTRAINT compliance_evidence_entries_review_interval_check
  CHECK (review_interval IN ('none', '6m', '12m', '24m', 'custom'));
