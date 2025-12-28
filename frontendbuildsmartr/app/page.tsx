import { createClient } from "@/utils/supabase/server";
import AuthButtons from "@/components/AuthButtons";
import AuthStateListener from "@/components/AuthStateListener";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[page.tsx] user:", user?.email ?? "not authenticated");

  if (user) {
    return <div className="p-4 text-foreground">You are signed in as {user.email}.</div>;
  }

  return (
    <>
      <AuthStateListener />
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md px-6 py-12">
          <div className="text-center mb-12">
            <div className="mb-6">
              <span className="text-5xl font-bold bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-transparent">
                IIvy
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Welcome back
            </h1>
            <p className="text-muted-foreground">
              Sign in to continue to your account
            </p>
          </div>
          
          <div className="bg-surface/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-xl">
            <div className="flex flex-col items-center">
              <AuthButtons />
            </div>
          </div>
          
          
        </div>
      </div>
    </>
  );
}
