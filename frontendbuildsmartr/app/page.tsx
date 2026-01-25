import { createClient } from "@/utils/supabase/server";
import { Suspense } from "react";
import Image from "next/image";
import AuthButtons from "@/components/AuthButtons";
import AuthStateListener from "@/components/AuthStateListener";
import { GeneralChatInterface } from "@/components/GeneralChatInterface";
import { HomepageSkeleton } from "@/components/ui/skeletons";
import logo from "@/public/logo.png";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[page.tsx] user:", user?.email ?? "not authenticated");

  // Authenticated users see  dashboard with projects
  if (user) {
    return (
      <Suspense fallback={<HomepageSkeleton />}>
        <GeneralChatInterface />
      </Suspense>
    );
  }

  // Unauthenticated users see the login page
  return (
    <>
      <AuthStateListener />
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* Subtle background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/3 pointer-events-none" />
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-md px-6 py-12 relative z-10">
          <div className="text-center mb-10">
            {/* IIVY Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 flex items-center justify-center">
                <Image src={logo} alt="IIVY" width={48} height={48} />
              </div>
              <span className="text-4xl font-bold bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-transparent">
                IIVY
              </span>
            </div>
            
            {/* Tagline badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium text-accent">Construction Knowledge Engine</span>
            </div>
            
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to continue to your projects
            </p>
          </div>

          <div className="flex flex-col items-center">
            <AuthButtons />
          </div>
          
          {/* Footer text */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </>
  );
}
