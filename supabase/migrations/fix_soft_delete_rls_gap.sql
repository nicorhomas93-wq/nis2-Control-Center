-- Bugfix: nis2_assessments, compliance_events und security_score_snapshots
-- bekamen mit add_soft_delete.sql eine deleted_at-Spalte, aber ihre SELECT-
-- Policies (aus add_team_data_access_rls.sql) filtern deleted_at bis heute
-- nicht — anders als documents/measures/risks/incidents/audit_exports/
-- company_assets, die alle "AND deleted_at IS NULL" haben. Das Owner-Tool
-- (src/lib/owner/soft-delete.ts) löscht darüber aktiv Datensätze weich, die
-- dadurch trotzdem sichtbar blieben (Audit-Summary-Export, Onboarding-
-- Checkliste, Score-Verlauf).

DROP POLICY IF EXISTS "Members read assessments" ON nis2_assessments;
CREATE POLICY "Members read assessments" ON nis2_assessments FOR SELECT
  TO authenticated USING (can_access_company(company_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Members read compliance events" ON compliance_events;
CREATE POLICY "Members read compliance events" ON compliance_events FOR SELECT
  TO authenticated USING (can_access_company(company_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Members read security score snapshots" ON security_score_snapshots;
CREATE POLICY "Members read security score snapshots" ON security_score_snapshots FOR SELECT
  TO authenticated USING (can_access_company(company_id) AND deleted_at IS NULL);
