-- Lieferanten N/A: Unternehmens-Relevanz + neue Nachweis-Status

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS vendors_applicability TEXT NOT NULL DEFAULT 'unknown'
  CHECK (vendors_applicability IN ('yes', 'no', 'unknown'));

ALTER TABLE vendor_evidence DROP CONSTRAINT IF EXISTS vendor_evidence_status_check;

UPDATE vendor_evidence
SET status = CASE status
  WHEN 'present' THEN 'fulfilled'
  WHEN 'missing' THEN 'not_fulfilled'
  WHEN 'expired' THEN 'not_fulfilled'
  WHEN 'review_due' THEN 'in_progress'
  ELSE status
END
WHERE status IN ('present', 'missing', 'expired', 'review_due');

ALTER TABLE vendor_evidence
  ADD CONSTRAINT vendor_evidence_status_check
  CHECK (status IN ('fulfilled', 'not_fulfilled', 'in_progress', 'not_applicable'));

CREATE INDEX IF NOT EXISTS idx_companies_vendors_applicability
  ON companies(vendors_applicability);
