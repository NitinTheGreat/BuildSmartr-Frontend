import { createClient } from "@/utils/supabase/server";
import AuthButtons from "@/components/AuthButtons";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[page.tsx] user:", user?.email ?? "not authenticated");

  if (user) {
    return <div className="p-4 text-foreground">You are signed in as {user.email}.</div>;
  }

  return <AuthButtons />;
}
