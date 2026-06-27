-- Consultant-Mandanten: mehrere Firmen pro Consultant-Account
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_mandant BOOLEAN NOT NULL DEFAULT FALSE;

-- Ein Login darf mehrere Mandanten-Firmen haben, aber nur ein eigenes Firmenprofil
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS companies_user_own_unique
  ON companies (user_id)
  WHERE is_mandant = FALSE;

CREATE INDEX IF NOT EXISTS companies_mandanten_by_user
  ON companies (user_id)
  WHERE is_mandant = TRUE;
