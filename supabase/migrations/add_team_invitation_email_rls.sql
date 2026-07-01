-- Owner ohne company_members-Zeile: Zugriff auf Einladungen und Team-Verwaltung
CREATE OR REPLACE FUNCTION public.user_company_role(p_company_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT m.role::text
      FROM company_members m
      WHERE m.company_id = p_company_id
        AND m.user_id = auth.uid()
        AND m.active = TRUE
      LIMIT 1
    ),
    (
      SELECT 'owner'
      FROM companies c
      WHERE c.id = p_company_id
        AND c.user_id = auth.uid()
        AND c.deleted_at IS NULL
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_company(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members m
    WHERE m.company_id = p_company_id
      AND m.user_id = auth.uid()
      AND m.active = TRUE
  )
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = p_company_id
      AND c.user_id = auth.uid()
      AND c.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_owner_or_admin(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(user_company_role(p_company_id) IN ('owner', 'admin'), FALSE);
$$;

DROP POLICY IF EXISTS "Owners manage invitations" ON company_invitations;
CREATE POLICY "Owners manage invitations" ON company_invitations FOR ALL
  USING (is_company_owner_or_admin(company_id))
  WITH CHECK (is_company_owner_or_admin(company_id));

DROP POLICY IF EXISTS "Owners manage company_members" ON company_members;
CREATE POLICY "Owners manage company_members" ON company_members FOR ALL
  USING (is_company_owner_or_admin(company_id))
  WITH CHECK (is_company_owner_or_admin(company_id));
