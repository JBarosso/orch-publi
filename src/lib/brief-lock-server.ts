import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { briefLocks, settings } from "@/lib/schema";
import {
  DEFAULT_LOCK_MAX_MINUTES,
  computeLockStatus,
  lockThresholds,
  type LockStatus,
} from "@/lib/brief-lock";

// Côté serveur du verrou d'édition (principe : cf. brief-lock.ts).

const SESSION_COOKIE = "bb_session";
const LOCK_MAX_SETTING_KEY = "lockMaxMinutes";

/**
 * Identité anonyme de l'appelant : empreinte de son jeton de session. Le
 * jeton lui-même ne va jamais en base — il suffit à se connecter.
 */
export function sessionFingerprint(request: NextRequest): string | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? createHash("sha256").update(token).digest("hex") : null;
}

export async function getLockMaxMinutes(): Promise<number> {
  const [row] = await db.select().from(settings).where(eq(settings.key, LOCK_MAX_SETTING_KEY));
  const minutes = (row?.value as { minutes?: number } | undefined)?.minutes;
  return typeof minutes === "number" && minutes > 0 ? minutes : DEFAULT_LOCK_MAX_MINUTES;
}

export async function setLockMaxMinutes(minutes: number): Promise<void> {
  await db
    .insert(settings)
    .values({ key: LOCK_MAX_SETTING_KEY, value: { minutes } })
    .onConflictDoUpdate({ target: settings.key, set: { value: { minutes }, updatedAt: new Date() } });
}

export async function readLock(briefId: string, me: string | null): Promise<LockStatus> {
  const [row, maxMinutes] = await Promise.all([
    db.select().from(briefLocks).where(eq(briefLocks.briefId, briefId)).then((rows) => rows[0]),
    getLockMaxMinutes(),
  ]);
  return computeLockStatus(row, me, new Date(), maxMinutes);
}

/**
 * Pose (ou renouvelle) le verrou, en une seule requête atomique : la ligne
 * n'est écrite que si le verrou est libre, déjà à moi, ou périmé. Deux
 * personnes qui cliquent en même temps ne peuvent donc pas l'obtenir toutes
 * les deux. Renouveler son propre verrou repart de zéro pour la durée max.
 */
export async function acquireLock(briefId: string, me: string): Promise<LockStatus> {
  const now = new Date();
  const maxMinutes = await getLockMaxMinutes();
  const { staleBefore, expiredBefore } = lockThresholds(now, maxMinutes);
  const [row] = await db
    .insert(briefLocks)
    .values({ briefId, lockedBy: me, lockedAt: now, heartbeatAt: now })
    .onConflictDoUpdate({
      target: briefLocks.briefId,
      set: { lockedBy: me, lockedAt: now, heartbeatAt: now },
      setWhere: or(
        eq(briefLocks.lockedBy, me),
        lt(briefLocks.heartbeatAt, staleBefore),
        lt(briefLocks.lockedAt, expiredBefore),
      ),
    })
    .returning();
  // Aucune ligne renvoyée : le verrou est vivant et tenu par quelqu'un d'autre.
  return row ? computeLockStatus(row, me, now, maxMinutes) : readLock(briefId, me);
}

/** Signe de vie : prolonge la vie du verrou, jamais sa durée maximale. */
export async function heartbeatLock(briefId: string, me: string): Promise<LockStatus> {
  const now = new Date();
  const maxMinutes = await getLockMaxMinutes();
  const { staleBefore, expiredBefore } = lockThresholds(now, maxMinutes);
  const [row] = await db
    .update(briefLocks)
    .set({ heartbeatAt: now })
    .where(
      and(
        eq(briefLocks.briefId, briefId),
        eq(briefLocks.lockedBy, me),
        gte(briefLocks.heartbeatAt, staleBefore),
        gte(briefLocks.lockedAt, expiredBefore),
      ),
    )
    .returning();
  return row ? computeLockStatus(row, me, now, maxMinutes) : readLock(briefId, me);
}

export async function releaseLock(briefId: string, me: string): Promise<void> {
  await db
    .delete(briefLocks)
    .where(and(eq(briefLocks.briefId, briefId), eq(briefLocks.lockedBy, me)));
}

/**
 * Garde des écritures de contenu : refuse si l'appelant ne tient pas le
 * verrou du brief. L'interface est déjà en lecture seule dans ce cas ; ceci
 * couvre l'onglet qui n'aurait pas encore vu qu'il a perdu le verrou, et
 * qui écraserait sinon le travail de la personne qui l'a repris.
 */
export async function requireBriefLock(
  request: NextRequest,
  briefId: string,
): Promise<NextResponse | null> {
  const status = await readLock(briefId, sessionFingerprint(request));
  if (status.state === "mine") return null;
  return NextResponse.json(
    {
      error:
        status.state === "other"
          ? "Ce brief est verrouillé par quelqu'un d'autre : modification impossible."
          : "Verrouillez le brief avant de le modifier (votre verrou a peut-être expiré).",
      lock: status,
    },
    { status: 423 },
  );
}
