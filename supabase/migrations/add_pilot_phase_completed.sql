-- Markiert Übergang: einmalige Pilotphase vorbei → laufendes 99-€-Abo
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pilot_phase_completed_at timestamptz;
