import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEV_GATE_COOKIE = "dev_gate_auth";

export function middleware(request: NextRequest) {
  const envEnabled = process.env.ENABLE_DEV_GATE === "true";
  const host =
    request.headers.get("host") ??
    request.nextUrl.hostname ??
    request.nextUrl.host ??
    "";
  const isEventyrProduction =
    (process.env.VERCEL_ENV === "production" ||
      process.env.NODE_ENV === "production") &&
    host.includes("eventyrsailinglogistics.com");

  // Production eventyr: always gate. Other: gate only if ENABLE_DEV_GATE=true.
  // To disable on production, remove the isEventyrProduction check below.
  const enableGate = isEventyrProduction || envEnabled;
  if (!enableGate) {
    return NextResponse.next();
  }

  // Never gate API routes, static files, or Next.js internals
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isDevGatePage = pathname === "/dev-gate";
  const hasValidCookie = request.cookies.get(DEV_GATE_COOKIE)?.value === "1";

  if (hasValidCookie) {
    if (isDevGatePage) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (isDevGatePage) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/dev-gate", request.url));
}

export const config = {
  matcher: [
    "/((?!api|_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
