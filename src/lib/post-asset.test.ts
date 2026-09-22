import { describe, it, expect } from "vitest";
import { dropOriginOf, rememberDropOrigin } from "./post-asset";

const transfer = (data: Record<string, string>) => ({ getData: (type: string) => data[type] ?? "" }) as DataTransfer;
const file = () => new File(["x"], "image.png", { type: "image/png" });

describe("rememberDropOrigin / dropOriginOf", () => {
  it("retient l'URL d'une image glissée depuis une page web, attachée au fichier", () => {
    const f = file();
    rememberDropOrigin(f, transfer({ "text/uri-list": "# commentaire\r\nhttps://sp.example/img.png" }));
    expect(dropOriginOf(f)).toBe("https://sp.example/img.png");
    // Un autre fichier n'hérite de rien.
    expect(dropOriginOf(file())).toBeNull();
  });

  it("se rabat sur le HTML glissé (<img src>) faute de liste d'URL", () => {
    const f = file();
    rememberDropOrigin(f, transfer({ "text/html": '<img alt="" src="https://sp.example/a.jpg">' }));
    expect(dropOriginOf(f)).toBe("https://sp.example/a.jpg");
  });

  it("n'invente rien pour un fichier du disque local", () => {
    const f = file();
    rememberDropOrigin(f, transfer({ "text/uri-list": "file:///C:/Users/moi/image.png" }));
    rememberDropOrigin(f, null);
    expect(dropOriginOf(f)).toBeNull();
    expect(dropOriginOf(undefined)).toBeNull();
  });

  it("ne plante pas si le navigateur refuse la lecture", () => {
    const f = file();
    const hostile = { getData: () => { throw new Error("SecurityError"); } } as unknown as DataTransfer;
    expect(() => rememberDropOrigin(f, hostile)).not.toThrow();
    expect(dropOriginOf(f)).toBeNull();
  });
});
