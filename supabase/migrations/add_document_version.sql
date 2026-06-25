-- Migration: Dokumenten-Versionierung
-- Im Supabase SQL Editor ausführen, falls documents bereits existiert

ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

UPDATE documents SET version = 1 WHERE version IS NULL;
