import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FunnelSuccessClient } from "@/components/funnel/FunnelSuccessClient";

export const metadata = {
  title: "Setup abgeschlossen | TKND NIS2 Control Center",
};

export default async function SuccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/success");

  return <FunnelSuccessClient />;
}
