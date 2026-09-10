import { describe, it, expect } from "vitest";
import { isTempUploadUrl } from "@/lib/storage";

const STORE = "https://abc123.public.blob.vercel-storage.com";

// Garde-fou avant de lire, puis supprimer, un fichier désigné par le navigateur.
describe("isTempUploadUrl", () => {
  it("accepte un upload direct déposé sous tmp/", () => {
    expect(isTempUploadUrl(`${STORE}/tmp/upload-Xy12Ab.tif`)).toBe(true);
  });

  it("refuse un asset définitif, qui serait supprimé après traitement", () => {
    expect(isTempUploadUrl(`${STORE}/0b6c1d2e-Xy12Ab.jpg`)).toBe(false);
    expect(isTempUploadUrl(`${STORE}/tmp/../0b6c1d2e-Xy12Ab.jpg`)).toBe(false);
  });

  it("refuse tout autre hôte, protocole ou valeur", () => {
    expect(isTempUploadUrl("https://evil.test/tmp/x.tif")).toBe(false);
    expect(isTempUploadUrl("https://abc123.public.blob.vercel-storage.com.evil.test/tmp/x.tif")).toBe(false);
    expect(isTempUploadUrl("http://abc123.public.blob.vercel-storage.com/tmp/x.tif")).toBe(false);
    expect(isTempUploadUrl("/uploads/tmp/x.png")).toBe(false);
    expect(isTempUploadUrl(null)).toBe(false);
  });
});
