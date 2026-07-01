-- Eingeladene Nutzer dürfen sich selbst als Mitglied anlegen (gültige Einladung)

DROP POLICY IF EXISTS "Invitee accept membership" ON company_members;
CREATE POLICY "Invitee accept membership" ON company_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM company_invitations i
      JOIN profiles p ON p.id = auth.uid()
      WHERE i.company_id = company_members.company_id
        AND i.status = 'invited'
        AND i.expires_at > NOW()
        AND lower(trim(i.email)) = lower(trim(p.email))
        AND i.role = company_members.role
    )
  );

DROP POLICY IF EXISTS "Invitee update invitation" ON company_invitations;
CREATE POLICY "Invitee update invitation" ON company_invitations FOR UPDATE
  USING (
    lower(trim(email)) = lower(trim((SELECT email FROM profiles WHERE id = auth.uid())))
    AND status = 'invited'
  );
