import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function requestToken(pathname: string) {
  return POST(
    new NextRequest("http://localhost/api/assets/blob-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "blob.generate-client-token",
        payload: { pathname, clientPayload: null, multipart: false },
      }),
    }),
  );
}

// La génération du jeton est locale (signature avec le token Blob) : aucun appel réseau.
describe("POST /api/assets/blob-token", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("délivre un jeton pour un dépôt sous tmp/", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_teststore_secret");
    const res = await requestToken("tmp/upload");
    expect(res.status).toBe(200);
    expect((await res.json()).clientToken).toEqual(expect.any(String));
  });

  it("refuse tout dépôt hors de tmp/", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_teststore_secret");
    expect((await requestToken("0b6c1d2e.jpg")).status).toBe(400);
    expect((await requestToken("tmp/../0b6c1d2e.jpg")).status).toBe(400);
  });

  it("répond 501 sans Blob configuré, pour que le navigateur passe par la route", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect((await requestToken("tmp/upload")).status).toBe(501);
  });
});
