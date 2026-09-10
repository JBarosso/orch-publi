import { NextRequest, NextResponse } from "next/server";

// /api/cron : appelée par le cron Vercel, qui n'a pas de cookie de session —
// la route vérifie elle-même CRON_SECRET.
// /demo-9ec02e0f : démo publique sans base ni login (src/app/demo-9ec02e0f) —
// elle n'appelle aucune route protégée, et son export d'images n'accepte que
// les visuels de sa propre galerie.
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/preview/cms-css", "/api/cron", "/demo-9ec02e0f"];

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
