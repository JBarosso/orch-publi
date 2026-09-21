import { describe, it, expect } from "vitest";
import {
  LOCK_HEARTBEAT_TIMEOUT_MS,
  clampLockMaxMinutes,
  computeLockStatus,
  lockThresholds,
} from "./brief-lock";

const T0 = new Date("2026-09-21T10:00:00Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

describe("computeLockStatus", () => {
  it("est libre sans verrou", () => {
    expect(computeLockStatus(null, "moi", T0, 60)).toEqual({ state: "free", expiresAt: null });
  });

  it("distingue mon verrou de celui de quelqu'un d'autre", () => {
    const row = { lockedBy: "moi", lockedAt: T0, heartbeatAt: at(1) };
    expect(computeLockStatus(row, "moi", at(1), 60).state).toBe("mine");
    expect(computeLockStatus(row, "autre", at(1), 60).state).toBe("other");
    // Sans session identifiable, on ne peut jamais être le détenteur.
    expect(computeLockStatus(row, null, at(1), 60).state).toBe("other");
  });

  // Onglet planté ou portable en veille : plus de signe de vie.
  it("se libère quand l'onglet ne donne plus signe de vie", () => {
    const row = { lockedBy: "autre", lockedAt: T0, heartbeatAt: T0 };
    expect(computeLockStatus(row, "moi", at(1), 60).state).toBe("other");
    const afterTimeout = new Date(T0.getTime() + LOCK_HEARTBEAT_TIMEOUT_MS);
    expect(computeLockStatus(row, "moi", afterTimeout, 60).state).toBe("free");
  });

  // Le garde-fou demandé : même un onglet actif perd le verrou au bout de
  // la durée maximale, comptée depuis la pose et non depuis la dernière
  // activité — sinon un onglet oublié bloquerait le brief indéfiniment.
  it("se libère à la durée maximale même si l'onglet est toujours actif", () => {
    const row = { lockedBy: "autre", lockedAt: T0, heartbeatAt: at(59.5) };
    expect(computeLockStatus(row, "moi", at(59.9), 60).state).toBe("other");
    expect(computeLockStatus({ ...row, heartbeatAt: at(60) }, "moi", at(60), 60).state).toBe("free");
  });

  it("annonce la fin de la durée maximale, pas celle du signe de vie", () => {
    const row = { lockedBy: "moi", lockedAt: T0, heartbeatAt: at(10) };
    expect(computeLockStatus(row, "moi", at(10), 60).expiresAt).toBe(at(60).toISOString());
  });
});

describe("lockThresholds", () => {
  it("fournit les instants avant lesquels un verrou est périmé", () => {
    const { staleBefore, expiredBefore } = lockThresholds(at(90), 60);
    expect(staleBefore.getTime()).toBe(at(90).getTime() - LOCK_HEARTBEAT_TIMEOUT_MS);
    expect(expiredBefore).toEqual(at(30));
  });
});

describe("clampLockMaxMinutes", () => {
  it("accepte une durée entière dans les bornes", () => {
    expect(clampLockMaxMinutes(60)).toBe(60);
    expect(clampLockMaxMinutes("90")).toBe(90);
  });

  it("refuse une durée hors bornes ou non entière", () => {
    expect(clampLockMaxMinutes(1)).toBeNull();
    expect(clampLockMaxMinutes(24 * 60 + 1)).toBeNull();
    expect(clampLockMaxMinutes(12.5)).toBeNull();
    expect(clampLockMaxMinutes("abc")).toBeNull();
  });
});
