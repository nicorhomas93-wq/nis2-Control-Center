-- profiles.plan/role fehlten → handle_new_user schlug fehl ("Database error creating new user")

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'pilot';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

UPDATE profiles
SET
  plan = COALESCE(plan, 'pilot'),
  role = COALESCE(role, 'user')
WHERE plan IS NULL OR role IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'plan', 'pilot'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email = COALESCE(public.profiles.email, EXCLUDED.email),
      plan = COALESCE(public.profiles.plan, EXCLUDED.plan),
      role = COALESCE(public.profiles.role, EXCLUDED.role);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
