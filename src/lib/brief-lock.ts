// Verrou d'édition d'un brief : une seule personne à la fois le modifie.
//
// Anonyme — l'app n'a qu'un mot de passe partagé, mais chaque connexion crée
// sa propre session : son empreinte suffit à distinguer « moi » des autres.
// Un verrou se libère tout seul de trois façons :
//   - en quittant le brief (l'onglet le rend explicitement) ;
//   - sans signe de vie depuis LOCK_HEARTBEAT_TIMEOUT_MS (onglet planté,
//     portable en veille, coupure réseau) ;
//   - passé la durée maximale réglée dans Paramétrage, comptée depuis la pose
//     du verrou et non depuis la dernière activité : c'est le garde-fou contre
//     l'onglet resté ouvert, puisqu'on ne peut pas reprendre la main.

export const LOCK_HEARTBEAT_INTERVAL_MS = 30_000;
export const LOCK_HEARTBEAT_TIMEOUT_MS = 2 * 60_000;

/** Sans interaction depuis ce délai, un onglet visible est considéré endormi. */
export const TAB_IDLE_AFTER_MS = 5 * 60_000;

/**
 * Faut-il continuer à interroger le serveur depuis cet onglet ? Un onglet
 * caché ou laissé de côté n'a personne devant lui : ses appels ne servent à
 * rien et empêchent la base de données de se mettre en veille.
 */
export function isTabAwake(
  visible: boolean,
  lastActivityAt: number,
  now: number,
  idleAfterMs = TAB_IDLE_AFTER_MS,
): boolean {
  return visible && now - lastActivityAt < idleAfterMs;
}

export const DEFAULT_LOCK_MAX_MINUTES = 60;
export const MIN_LOCK_MAX_MINUTES = 5;
export const MAX_LOCK_MAX_MINUTES = 24 * 60;

export type LockState = "free" | "mine" | "other";

export interface LockRow {
  lockedBy: string;
  lockedAt: Date;
  heartbeatAt: Date;
}

export interface LockStatus {
  state: LockState;
  /** Fin de la durée maximale du verrou en cours ; null s'il est libre. */
  expiresAt: string | null;
}

export function computeLockStatus(
  row: LockRow | null | undefined,
  me: string | null,
  now: Date,
  maxMinutes: number,
): LockStatus {
  if (!row) return { state: "free", expiresAt: null };
  const hardExpiry = row.lockedAt.getTime() + maxMinutes * 60_000;
  const liveUntil = row.heartbeatAt.getTime() + LOCK_HEARTBEAT_TIMEOUT_MS;
  if (now.getTime() >= Math.min(hardExpiry, liveUntil)) return { state: "free", expiresAt: null };
  return {
    state: me && row.lockedBy === me ? "mine" : "other",
    expiresAt: new Date(hardExpiry).toISOString(),
  };
}

/** Seuils en deçà desquels un verrou est périmé, pour les requêtes SQL. */
export function lockThresholds(now: Date, maxMinutes: number) {
  return {
    staleBefore: new Date(now.getTime() - LOCK_HEARTBEAT_TIMEOUT_MS),
    expiredBefore: new Date(now.getTime() - maxMinutes * 60_000),
  };
}

export function clampLockMaxMinutes(value: unknown): number | null {
  const minutes = Number(value);
  if (!Number.isInteger(minutes)) return null;
  if (minutes < MIN_LOCK_MAX_MINUTES || minutes > MAX_LOCK_MAX_MINUTES) return null;
  return minutes;
}
