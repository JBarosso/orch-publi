import { NextRequest, NextResponse } from "next/server";

// /api/cron : appelée par le cron Vercel, qui n'a pas de cookie de session —
// la route vérifie elle-même CRON_SECRET.
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/preview/cms-css", "/api/cron"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = request.cookies.get("bb_session");
  if (!session?.value) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/|fonts/).*)",
  ],
};
