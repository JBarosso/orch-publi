import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { runScheduledPurge } = vi.hoisted(() => ({ runScheduledPurge: vi.fn() }));
vi.mock("@/lib/retention", () => ({ runScheduledPurge }));

import { GET } from "./route";

function call(authorization?: string) {
  return GET(
    new NextRequest("http://localhost/api/cron/retention", {
      headers: authorization ? { authorization } : {},
    }),
  );
}

// Route publique qui supprime des données : c'est le contrôle d'accès qui est testé.
describe("GET /api/cron/retention", () => {
  beforeEach(() => {
    runScheduledPurge.mockReset().mockResolvedValue({ deletedVideos: 0 });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuse tout quand CRON_SECRET n'est pas configuré", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
    expect(runScheduledPurge).not.toHaveBeenCalled();
  });

  it("refuse un appel sans en-tête ou avec un mauvais secret", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer autre")).status).toBe(401);
    expect(runScheduledPurge).not.toHaveBeenCalled();
  });

  it("lance la purge avec le bon secret", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await call("Bearer s3cret")).status).toBe(200);
    expect(runScheduledPurge).toHaveBeenCalledOnce();
  });

  it("répond 500 quand la purge a échoué, pour que l'échec apparaisse dans les logs Vercel", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    runScheduledPurge.mockResolvedValue({ error: "stockage indisponible" });
    expect((await call("Bearer s3cret")).status).toBe(500);
  });
});
