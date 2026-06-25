import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { shouldShowStrongCta, getLeadByVisitorId } from "@/lib/acquisition/follow-up/engine";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const visitorId = url.searchParams.get("visitorId");

  if (!visitorId) {
    return NextResponse.json({ strongCta: false });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ strongCta: false });
  }

  const lead = await getLeadByVisitorId(admin, visitorId);

  return NextResponse.json({
    strongCta: shouldShowStrongCta(lead),
    lifecycleStatus: lead?.lifecycle_status ?? null,
    sequenceId: lead?.sequence_id ?? null,
  });
}
