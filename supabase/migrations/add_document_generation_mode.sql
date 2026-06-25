-- generation_mode Spalte für documents
-- Im Supabase SQL Editor ausführen, falls documents bereits existiert

ALTER TABLE documents ADD COLUMN IF NOT EXISTS generation_mode TEXT;
