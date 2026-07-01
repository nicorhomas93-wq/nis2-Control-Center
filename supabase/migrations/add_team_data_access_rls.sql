-- Team-Mitglieder: Lese-/Schreibzugriff auf die gemeinsame Firma (nicht nur companies.user_id)

-- ─── companies ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users manage own company" ON companies;

CREATE POLICY "Members read company"
  ON companies FOR SELECT
  TO authenticated
  USING (can_access_company(id) AND deleted_at IS NULL);

CREATE POLICY "Users create own company"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers update company"
  ON companies FOR UPDATE
  TO authenticated
  USING (can_write_company(id) OR auth.uid() = user_id)
  WITH CHECK (can_write_company(id) OR auth.uid() = user_id);

CREATE POLICY "Owners delete own company"
  ON companies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── Kern-Compliance-Tabellen ───────────────────────────────────────────────

DROP POLICY IF EXISTS "Users manage own assessments" ON nis2_assessments;
CREATE POLICY "Members read assessments" ON nis2_assessments FOR SELECT
  TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Writers manage assessments" ON nis2_assessments FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers update assessments" ON nis2_assessments FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers delete assessments" ON nis2_assessments FOR DELETE
  TO authenticated USING (can_write_company(company_id));

DROP POLICY IF EXISTS "Users manage own documents" ON documents;
CREATE POLICY "Members read documents" ON documents FOR SELECT
  TO authenticated USING (can_access_company(company_id) AND deleted_at IS NULL);
CREATE POLICY "Writers insert documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers update documents" ON documents FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers delete documents" ON documents FOR DELETE
  TO authenticated USING (can_write_company(company_id));

DROP POLICY IF EXISTS "Users manage own measures" ON measures;
CREATE POLICY "Members read measures" ON measures FOR SELECT
  TO authenticated USING (can_access_company(company_id) AND deleted_at IS NULL);
CREATE POLICY "Writers insert measures" ON measures FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers update measures" ON measures FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers delete measures" ON measures FOR DELETE
  TO authenticated USING (can_write_company(company_id));

DROP POLICY IF EXISTS "Users manage own risks" ON risks;
CREATE POLICY "Members read risks" ON risks FOR SELECT
  TO authenticated USING (can_access_company(company_id) AND deleted_at IS NULL);
CREATE POLICY "Writers insert risks" ON risks FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers update risks" ON risks FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers delete risks" ON risks FOR DELETE
  TO authenticated USING (can_write_company(company_id));

DROP POLICY IF EXISTS "Users manage own incidents" ON incidents;
CREATE POLICY "Members read incidents" ON incidents FOR SELECT
  TO authenticated USING (can_access_company(company_id) AND deleted_at IS NULL);
CREATE POLICY "Writers insert incidents" ON incidents FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers update incidents" ON incidents FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers delete incidents" ON incidents FOR DELETE
  TO authenticated USING (can_write_company(company_id));

DROP POLICY IF EXISTS "Users manage own audit exports" ON audit_exports;
CREATE POLICY "Members read audit exports" ON audit_exports FOR SELECT
  TO authenticated USING (can_access_company(company_id) AND deleted_at IS NULL);
CREATE POLICY "Writers insert audit exports" ON audit_exports FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers update audit exports" ON audit_exports FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers delete audit exports" ON audit_exports FOR DELETE
  TO authenticated USING (can_write_company(company_id));

-- ─── Erweiterte Compliance-Tabellen ─────────────────────────────────────────

DROP POLICY IF EXISTS "Users manage own compliance events" ON compliance_events;
CREATE POLICY "Members read compliance events" ON compliance_events FOR SELECT
  TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Writers manage compliance events" ON compliance_events FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers update compliance events" ON compliance_events FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers delete compliance events" ON compliance_events FOR DELETE
  TO authenticated USING (can_write_company(company_id));

DROP POLICY IF EXISTS "Users manage own company assets" ON company_assets;
CREATE POLICY "Members read company assets" ON company_assets FOR SELECT
  TO authenticated USING (can_access_company(company_id) AND deleted_at IS NULL);
CREATE POLICY "Writers insert company assets" ON company_assets FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers update company assets" ON company_assets FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers delete company assets" ON company_assets FOR DELETE
  TO authenticated USING (can_write_company(company_id));

DROP POLICY IF EXISTS "Users manage own company score snapshots" ON security_score_snapshots;
CREATE POLICY "Members read security score snapshots" ON security_score_snapshots FOR SELECT
  TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Writers manage security score snapshots" ON security_score_snapshots FOR INSERT
  TO authenticated WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers update security score snapshots" ON security_score_snapshots FOR UPDATE
  TO authenticated
  USING (can_write_company(company_id)) WITH CHECK (can_write_company(company_id));
CREATE POLICY "Writers delete security score snapshots" ON security_score_snapshots FOR DELETE
  TO authenticated USING (can_write_company(company_id));

DROP POLICY IF EXISTS "Users read own billing events" ON billing_events;
CREATE POLICY "Members read billing events" ON billing_events FOR SELECT
  TO authenticated USING (can_access_company(company_id));
