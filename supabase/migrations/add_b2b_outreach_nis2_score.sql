-- NIS2-Relevanz-Score (0–10) und optionale Hinweise pro Lead

ALTER TABLE b2b_outreach_leads
  ADD COLUMN IF NOT EXISTS nis2_relevance_score INTEGER,
  ADD COLUMN IF NOT EXISTS hints TEXT;

CREATE INDEX IF NOT EXISTS idx_b2b_outreach_leads_nis2_score
  ON b2b_outreach_leads(nis2_relevance_score DESC NULLS LAST);
