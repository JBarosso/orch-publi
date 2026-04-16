import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const expectedPassword = process.env.APP_PASSWORD || "briefbuilder";

  if (password !== expectedPassword) {
    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 },
    );
  }

  await createSession();
  return NextResponse.json({ success: true });
}
