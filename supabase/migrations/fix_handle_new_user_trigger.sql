-- Auth-Trigger: Profil beim Signup zuverlässig anlegen (RLS-sicher)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan, role, status)
  VALUES (NEW.id, NEW.email, 'pilot', 'user', 'active')
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(public.profiles.email, EXCLUDED.email);

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'handle_new_user failed: %', SQLERRM;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fallback-Policy: Service-Role / Trigger dürfen Profile anlegen
DROP POLICY IF EXISTS "Service role manage profiles" ON profiles;
CREATE POLICY "Service role manage profiles" ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
