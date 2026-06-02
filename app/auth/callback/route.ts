import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/settings";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/settings";

  if (code) {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.redirect(new URL("/settings?auth=not-configured", request.url));
    }

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(next, request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/settings?auth=error", request.url));
    }
  }

  return NextResponse.redirect(new URL("/settings?auth=error", request.url));
}
