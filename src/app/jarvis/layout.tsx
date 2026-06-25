import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessJarvis } from "@/lib/jarvis/access";

export default async function JarvisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/jarvis");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canAccessJarvis(user.email, profile?.role)) {
    redirect("/dashboard");
  }

  return children;
}
