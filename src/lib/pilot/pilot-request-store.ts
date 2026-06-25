import { appendFile, mkdir } from "fs/promises";
import path from "path";

export interface PilotRequestInput {
  name: string;
  company: string;
  email: string;
  phone: string | null;
  industry: string | null;
  message: string | null;
}

const DATA_DIR = path.join(process.cwd(), "data");
const REQUESTS_FILE = path.join(DATA_DIR, "pilot-requests.jsonl");

/** Lokaler Fallback, wenn Supabase noch nicht migriert ist (z. B. lokale Entwicklung). */
export async function savePilotRequestLocally(
  input: PilotRequestInput
): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const line = JSON.stringify({
    ...input,
    created_at: new Date().toISOString(),
    source: "local-fallback",
  });
  await appendFile(REQUESTS_FILE, `${line}\n`, "utf8");
}
