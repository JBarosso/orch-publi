import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Couleurs recommandées pour le fond du bandeau "Global header" (Settings).
// Modifiables depuis la page Paramétrage — voir src/app/(app)/settings/page.tsx.

export const HEADER_COLORS_SETTING_KEY = "headerColors";

export interface HeaderColor {
  name: string;
  hex: string;
}

const DEFAULT_HEADER_COLORS: HeaderColor[] = [{ name: "Orchestra", hex: "#ee1f2d" }];

export async function getHeaderColors(): Promise<HeaderColor[]> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, HEADER_COLORS_SETTING_KEY));
  const colors = row?.value as HeaderColor[] | undefined;
  return Array.isArray(colors) && colors.length > 0 ? colors : DEFAULT_HEADER_COLORS;
}

export async function setHeaderColors(colors: HeaderColor[]): Promise<void> {
  await db
    .insert(settings)
    .values({ key: HEADER_COLORS_SETTING_KEY, value: colors })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: colors, updatedAt: new Date() },
    });
}
