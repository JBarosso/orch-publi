import { describe, it, expect } from "vitest";
import { richTextFromNodes, richTextToHtml, type RichNode } from "./rich-text";

// Mini-DOM pour les tests : texte, ou balise avec enfants et attributs.
const t = (text: string): RichNode => ({ nodeType: 3, nodeName: "#text", textContent: text, childNodes: [] });
const el = (name: string, children: RichNode[] = [], attrs: Record<string, string> = {}): RichNode => ({
  nodeType: 1,
  nodeName: name,
  textContent: null,
  childNodes: children,
  lastChild: children[children.length - 1] ?? null,
  getAttribute: (n) => attrs[n] ?? null,
});
const root = (...children: RichNode[]) => el("DIV", children);

describe("richTextFromNodes (éditeur visuel → balisage)", () => {
  it("relit gras, italique, liens et sauts de ligne produits par le navigateur", () => {
    expect(
      richTextFromNodes(
        root(t("un "), el("B", [t("mot")]), t(" et "), el("I", [t("un autre")]), el("BR"), t("ligne 2")),
      ),
    ).toBe("un **mot** et *un autre*\nligne 2");
    expect(richTextFromNodes(root(el("A", [t("Outlet")], { href: "cgid:outlet" })))).toBe("[Outlet](cgid:outlet)");
  });

  it("sort les espaces des marqueurs et ignore les balises inconnues", () => {
    expect(richTextFromNodes(root(el("STRONG", [t("mot ")]), t("suite")))).toBe("**mot** suite");
    expect(richTextFromNodes(root(el("U", [t("souligné")]), t(" !")))).toBe("souligné !");
  });

  it("blocs et <br> final de support du curseur", () => {
    expect(richTextFromNodes(root(t("a"), el("DIV", [t("b")])))).toBe("a\nb");
    expect(richTextFromNodes(root(t("abc"), el("BR"), el("BR")))).toBe("abc\n");
  });
});

describe("richTextToHtml en mode éditeur", () => {
  it("garde la cible brute des liens pour pouvoir la relire", () => {
    expect(richTextToHtml("[Outlet](cgid:outlet)", { preview: false, rawLinks: true })).toBe(
      '<a href="cgid:outlet" title="cgid:outlet">Outlet</a>',
    );
  });
});

const html = (text: string, preview = false) => richTextToHtml(text, { preview });

describe("richTextToHtml", () => {
  it("gras, italique, imbrication et sauts de ligne", () => {
    expect(html("un **mot** et *un autre*\nligne 2")).toBe(
      "un <strong>mot</strong> et <em>un autre</em><br>ligne 2",
    );
    expect(html("**gras et *italique***")).toBe("<strong>gras et <em>italique</em></strong>");
    expect(html("*un **mot** ici*")).toBe("<em>un <strong>mot</strong> ici</em>");
    expect(html("**a** et **b**")).toBe("<strong>a</strong> et <strong>b</strong>");
  });

  it("liens : URL, chemin, cgid et cid vers les macros Salesforce", () => {
    expect(html("[Promo](https://ex.com/a?b=1&c=2)")).toBe('<a href="https://ex.com/a?b=1&amp;c=2">Promo</a>');
    expect(html("[Page](/fr/puericulture/)")).toBe('<a href="/fr/puericulture/">Page</a>');
    expect(html("[Outlet](cgid:outlet)")).toBe(`<a href="$url('Search-Show','cgid','outlet')$">Outlet</a>`);
    expect(html("[FAQ](cid:aide-faq)")).toBe(`<a href="$httpsUrl('Page-Show','cid','aide-faq')$">FAQ</a>`);
    expect(html("[**Gras**](cgid:x)")).toContain("<strong>Gras</strong></a>");
  });

  it("preview : lien toujours en nouvel onglet", () => {
    expect(html("[a](https://ex.com)", true)).toBe(
      '<a href="https://ex.com" target="_blank" rel="noopener noreferrer">a</a>',
    );
  });

  it("n'altère jamais une URL et refuse les liens dangereux", () => {
    expect(html("[x](https://ex.com/a*b*c)")).toBe('<a href="https://ex.com/a*b*c">x</a>');
    expect(html("[clic](javascript:alert(1))")).not.toContain("<a");
  });

  it("échappe le HTML saisi et laisse un astérisque isolé tel quel", () => {
    expect(html('<script>alert("x")</script>')).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html("prix * 2")).toBe("prix * 2");
    expect(html("2 * 3 * 4")).toBe("2 * 3 * 4");
  });
});
