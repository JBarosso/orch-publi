import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sanitizeHiddenSectionTypes } from "@/lib/section-types";
import type { SectionType } from "@/types";

// Types de section masqués du menu de création (Paramétrage).
const HIDDEN_SECTION_TYPES_SETTING_KEY = "hiddenSectionTypes";

export async function getHiddenSectionTypes(): Promise<SectionType[]> {
  const [row] = await db.select().from(settings).where(eq(settings.key, HIDDEN_SECTION_TYPES_SETTING_KEY));
  return sanitizeHiddenSectionTypes(row?.value);
}

export async function setHiddenSectionTypes(types: SectionType[]): Promise<void> {
  await db
    .insert(settings)
    .values({ key: HIDDEN_SECTION_TYPES_SETTING_KEY, value: types })
    .onConflictDoUpdate({ target: settings.key, set: { value: types, updatedAt: new Date() } });
}
