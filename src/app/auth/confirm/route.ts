import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link callback. Handles both flows so it works regardless of the
 * project's email-template settings:
 *   - PKCE:        ?code=...            → exchangeCodeForSession
 *   - token_hash:  ?token_hash=&type=  → verifyOtp
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  // Only allow same-site relative paths. Anything else ("//evil.com",
  // "@evil.com", absolute URLs) would make this an open redirect.
  const rawNext = searchParams.get("next") ?? "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")
      ? rawNext
      : "/";
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // A password reset lands here first; once the session exists, send them on
  // to choose a new password rather than into the library.
  const destination = type === "recovery" ? "/auth/reset" : next;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
