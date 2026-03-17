import { createClient } from "@supabase/supabase-js";

// ✅ Server-only admin instance (service role key)
// NOTE: In the browser this will be null — never use it in client components.
// For client-side code, use @/lib/supabaseClient instead.
export const supabaseAdmin =
  typeof window === "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      )
    : null;