-- Lead Research: Scraper-Statistik für Unternehmensmeldungen

ALTER TABLE jarvis_lead_research_runs
  ADD COLUMN IF NOT EXISTS announcements_scanned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS announcements_matched INTEGER NOT NULL DEFAULT 0;
