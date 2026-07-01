-- Einladungen per Token lesen/annehmen ohne Service-Role (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT
    i.id,
    i.company_id,
    i.email,
    i.role,
    i.token,
    i.status,
    i.invited_by,
    i.expires_at,
    c.company_name
  INTO v_inv
  FROM company_invitations i
  LEFT JOIN companies c ON c.id = i.company_id
  WHERE i.token = trim(p_token)
    AND i.status = 'invited'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_inv.id,
    'company_id', v_inv.company_id,
    'email', v_inv.email,
    'role', v_inv.role,
    'token', v_inv.token,
    'status', v_inv.status,
    'invited_by', v_inv.invited_by,
    'expires_at', v_inv.expires_at,
    'company_name', v_inv.company_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_company_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_inv RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL OR length(trim(v_email)) = 0 THEN
    SELECT p.email INTO v_email
    FROM profiles p
    WHERE p.id = v_uid;
  END IF;

  SELECT
    i.id,
    i.company_id,
    i.email,
    i.role,
    i.invited_by,
    i.expires_at,
    c.company_name
  INTO v_inv
  FROM company_invitations i
  LEFT JOIN companies c ON c.id = i.company_id
  WHERE i.token = trim(p_token)
    AND i.status = 'invited'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_inv.expires_at <= NOW() THEN
    UPDATE company_invitations
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_inv.id;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_email IS NULL OR length(trim(v_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_missing');
  END IF;

  IF lower(trim(v_email)) <> lower(trim(v_inv.email)) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'email_mismatch',
      'expected_email', v_inv.email,
      'actual_email', v_email
    );
  END IF;

  INSERT INTO profiles (id, email)
  VALUES (v_uid, lower(trim(v_email)))
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(profiles.email, EXCLUDED.email);

  INSERT INTO company_members (company_id, user_id, role, active, invited_by)
  VALUES (v_inv.company_id, v_uid, v_inv.role, TRUE, v_inv.invited_by)
  ON CONFLICT (company_id, user_id) DO UPDATE
    SET
      role = EXCLUDED.role,
      active = TRUE,
      invited_by = EXCLUDED.invited_by,
      updated_at = NOW();

  UPDATE company_invitations
  SET status = 'active', accepted_at = NOW(), updated_at = NOW()
  WHERE id = v_inv.id;

  UPDATE profiles
  SET last_active_at = NOW()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'company_name', v_inv.company_name,
    'role', v_inv.role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_by_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_company_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_company_invitation(TEXT) TO authenticated, service_role;
