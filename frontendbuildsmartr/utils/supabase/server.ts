import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Next.js 16 makes cookies() async. Create the client after awaiting it.
export const createClient = async () => {
  const store = await cookies();

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};

/**
 * Cached getUser - deduplicates auth calls within the same request
 * Use this in server components instead of createClient().auth.getUser()
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
});

/**
 * Cached getSession - deduplicates session calls within the same request
 * Use this in server components instead of createClient().auth.getSession()
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
});

/**
 * Get both user and session in one cached call
 * Useful when you need both pieces of data
 */
export const getAuthData = cache(async () => {
  const supabase = await createClient();
  const [userResult, sessionResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  
  return {
    user: userResult.data.user,
    session: sessionResult.data.session,
    userError: userResult.error,
    sessionError: sessionResult.error,
  };
});
