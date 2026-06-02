import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

const isDevelopment = process.env.NODE_ENV === "development";

function logAuthDebug(message: string, details?: Record<string, string | boolean | null>) {
  if (!isDevelopment) return;
  console.info(`[auth callback] ${message}`, details ?? {});
}

function redirectToAuthError(request: NextRequest) {
  return NextResponse.redirect(new URL("/settings?auth=error", request.url));
}

function redirectToAuthSuccess(request: NextRequest, nextPath: string) {
  const target = nextPath === "/settings" ? "/settings?auth=success" : nextPath;
  return NextResponse.redirect(new URL(target, request.url));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");
  const providerErrorCode = requestUrl.searchParams.get("error_code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/settings";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/settings";

  logAuthDebug("route reached", {
    hasCode: Boolean(code),
    hasProviderError: Boolean(providerError),
    providerErrorCode
  });

  if (providerError) {
    logAuthDebug("provider returned an error before code exchange", {
      providerError,
      providerErrorCode
    });
    return redirectToAuthError(request);
  }

  if (code) {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.redirect(new URL("/settings?auth=not-configured", request.url));
    }

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        logAuthDebug("exchange success", { hasCode: true });
        return redirectToAuthSuccess(request, next);
      }
      logAuthDebug("exchange failure", {
        name: error.name,
        status: error.status ? String(error.status) : null,
        message: error.message
      });
    } catch {
      logAuthDebug("exchange failure", { name: "unexpected_exception" });
      return redirectToAuthError(request);
    }
  }

  logAuthDebug("missing code", { hasCode: false });
  return redirectToAuthError(request);
}
