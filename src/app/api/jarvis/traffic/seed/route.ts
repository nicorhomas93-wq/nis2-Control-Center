import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { seedTrafficDefaults } from "@/lib/jarvis/traffic/seed";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const result = await seedTrafficDefaults(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seed fehlgeschlagen" },
      { status: 500 }
    );
  }
}
