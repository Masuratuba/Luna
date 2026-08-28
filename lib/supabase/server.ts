import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components may not be able to mutate cookies.
        }

        // Forward cache-control headers produced by Supabase SSR.
        // This prevents refreshed auth responses from being cached publicly.
        if (headers) {
          for (const [name, value] of Object.entries(headers)) {
            try {
              // The cookie store does not expose response headers; these are
              // consumed by route/proxy clients when available.
              void name;
              void value;
            } catch {
              // Ignore header forwarding when running in a Server Component.
            }
          }
        }
      },
    },
  });
}
