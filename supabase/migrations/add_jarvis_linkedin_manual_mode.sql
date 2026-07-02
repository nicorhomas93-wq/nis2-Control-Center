-- Manuelles Profil (persönlicher Account, ohne LinkedIn API / Unternehmensseite)

ALTER TABLE linkedin_publishing_accounts
  ADD COLUMN IF NOT EXISTS connection_mode TEXT NOT NULL DEFAULT 'oauth';

COMMENT ON COLUMN linkedin_publishing_accounts.connection_mode IS 'oauth = API-Verbindung, manual = persönliches Profil ohne API';
