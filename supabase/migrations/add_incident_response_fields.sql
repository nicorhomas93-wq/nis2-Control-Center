-- Incident Response: erweiterte Felder für vollständige Vorfallbearbeitung

ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS incident_summary TEXT,
  ADD COLUMN IF NOT EXISTS root_cause TEXT,
  ADD COLUMN IF NOT EXISTS affected_assets TEXT,
  ADD COLUMN IF NOT EXISTS affected_persons TEXT,
  ADD COLUMN IF NOT EXISTS affected_systems TEXT,
  ADD COLUMN IF NOT EXISTS data_categories TEXT,
  ADD COLUMN IF NOT EXISTS estimated_impact TEXT,
  ADD COLUMN IF NOT EXISTS containment_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS corrective_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preventive_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS communication_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS employee_letter_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS employee_recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS employee_recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS employee_letter_text TEXT,
  ADD COLUMN IF NOT EXISTS management_report_text TEXT,
  ADD COLUMN IF NOT EXISTS audit_report_text TEXT,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by TEXT,
  ADD COLUMN IF NOT EXISTS evidence_links TEXT,
  ADD COLUMN IF NOT EXISTS generated_documents JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE incidents
SET status = 'completed'
WHERE status IN ('resolved', 'closed');

ALTER TABLE incidents
  ADD CONSTRAINT incidents_status_check
  CHECK (
    status IN (
      'open',
      'investigating',
      'waiting_feedback',
      'documentation_open',
      'completed',
      'resolved',
      'closed'
    )
  );
