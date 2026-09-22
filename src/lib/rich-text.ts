// Balisage léger du bloc « texte » des sections personnalisées :
//   **gras**   *italique*   [texte du lien](cible)
// cible = URL (https://…, /chemin, #ancre, mailto:), cgid:identifiant ou
// cid:identifiant — ces deux-là deviennent les macros Salesforce habituelles.

const INVISIBLE_CHARS = /[​-‍﻿­]/g;

function esc(str: string): string {
  return str
    .replace(INVISIBLE_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface RenderOptions {
  preview: boolean;
  /** Éditeur visuel : href = cible brute (cgid:x, cid:x, URL), relue telle quelle par richTextFromNodes. */
  rawLinks?: boolean;
}

/** href d'une cible déjà échappée, ou null si elle n'est pas un lien autorisé (ex: javascript:). */
function linkHref(target: string, rawLinks = false): string | null {
  const cgid = /^cgid:(.+)$/i.exec(target)?.[1];
  if (cgid) return rawLinks ? target : `$url('Search-Show','cgid','${cgid}')$`;
  const cid = /^cid:(.+)$/i.exec(target)?.[1];
  if (cid) return rawLinks ? target : `$httpsUrl('Page-Show','cid','${cid}')$`;
  return /^(https?:\/\/|\/|#|mailto:)/i.test(target) ? target : null;
}

// Un seul passage : la cible d'un lien est prise telle quelle et n'est jamais
// retouchée par le gras/italique (un « * » dans une URL reste intact). Le gras
// peut contenir un italique et inversement ; un astérisque collé à une espace
// n'ouvre ni ne ferme rien (« 2 * 3 * 4 » reste tel quel).
const INLINE =
  /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*(?!\s)((?:[^*\n]|\*[^*\n]+\*)+)(?<!\s)\*\*|\*(?!\s)((?:[^*\n]|\*\*[^*\n]+\*\*)+)(?<!\s)\*/g;

function inline(escaped: string, opts: RenderOptions): string {
  return escaped.replace(INLINE, (_m, label?: string, target?: string, bold?: string, italic?: string) => {
    if (label !== undefined && target !== undefined) {
      const href = linkHref(target, opts.rawLinks);
      const inner = inline(label, opts);
      if (href === null) return inner;
      // Preview : lien actif mais toujours dans un nouvel onglet, comme les
      // boutons de ce template — jamais de navigation qui quitterait l'éditeur.
      const attrs = opts.rawLinks
        ? ` title="${href}"`
        : opts.preview
          ? ` target="_blank" rel="noopener noreferrer"`
          : "";
      return `<a href="${href}"${attrs}>${inner}</a>`;
    }
    if (bold !== undefined) return `<strong>${inline(bold, opts)}</strong>`;
    return `<em>${inline(italic ?? "", opts)}</em>`;
  });
}

export function richTextToHtml(text: string, opts: RenderOptions): string {
  return inline(esc(text), opts).replace(/\n/g, "<br>");
}

/** Sous-ensemble du DOM lu par richTextFromNodes (testable sans navigateur). */
export interface RichNode {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<RichNode>;
  lastChild?: RichNode | null;
  getAttribute?(name: string): string | null;
}

// Les espaces restent hors des marqueurs : « **mot **» ne serait pas relu en gras.
function mark(inner: string, marker: string): string {
  const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner) ?? ["", "", inner, ""];
  return core ? `${lead}${marker}${core}${marker}${trail}` : inner;
}

function nodeToRichText(node: RichNode): string {
  if (node.nodeType === 3) return (node.textContent ?? "").replace(/ /g, " ");
  if (node.nodeType !== 1) return "";
  const inner = Array.from(node.childNodes).map(nodeToRichText).join("");
  switch (node.nodeName.toUpperCase()) {
    case "BR":
      return "\n";
    case "B":
    case "STRONG":
      return mark(inner, "**");
    case "I":
    case "EM":
      return mark(inner, "*");
    case "A": {
      const href = node.getAttribute?.("href");
      return href ? `[${inner}](${href})` : inner;
    }
    case "DIV":
    case "P":
      return `\n${inner}`;
    default:
      // Toute autre balise (collage, souligné…) : on garde le texte seul.
      return inner;
  }
}

/**
 * Relit le contenu de l'éditeur visuel en balisage léger — l'inverse de
 * richTextToHtml(…, { rawLinks: true }).
 */
export function richTextFromNodes(root: RichNode): string {
  let text = Array.from(root.childNodes).map(nodeToRichText).join("");
  // Un bloc en tête ne crée pas de ligne ; le <br> final n'est qu'un support de curseur.
  text = text.replace(/^\n/, "");
  if (root.lastChild?.nodeName.toUpperCase() === "BR") text = text.replace(/\n$/, "");
  return text;
}
