"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkFields, type LinkType } from "@/components/editor/link-fields";
import { richTextFromNodes, richTextToHtml } from "@/lib/rich-text";

interface LinkForm {
  // Sélection mémorisée à l'ouverture : le focus part ensuite dans les champs du lien.
  range: Range;
  linkType: LinkType;
  cgid: string;
  cid: string;
  link: string;
}

/** Cible au format attendu par src/lib/rich-text.ts (ni espace ni parenthèse fermante). */
function linkTarget(form: LinkForm): string {
  const clean = (s: string) => s.trim().replace(/\s/g, "").replace(/\)/g, "%29");
  if (form.linkType === "cgid") return form.cgid.trim() ? `cgid:${clean(form.cgid)}` : "";
  if (form.linkType === "cid") return form.cid.trim() ? `cid:${clean(form.cid)}` : "";
  return clean(form.link);
}

const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Éditeur visuel léger : le gras, l'italique et les liens s'affichent tels
 * quels, mais la valeur reste le balisage léger de src/lib/rich-text.ts
 * (**gras**, *italique*, [texte](lien)), relu depuis le contenu à chaque frappe.
 * Le champ n'est réécrit que si la valeur change de l'extérieur, pour ne pas
 * perdre la position du curseur pendant la saisie.
 */
export function RichTextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string | null>(null);
  const [linkForm, setLinkForm] = useState<LinkForm | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === lastValue.current) return;
    el.innerHTML = richTextToHtml(value, { preview: false, rawLinks: true });
    lastValue.current = value;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const next = richTextFromNodes(el);
    if (next === lastValue.current) return;
    lastValue.current = next;
    onChange(next);
  };

  // execCommand est déprécié mais reste le seul moyen natif d'éditer un
  // contentEditable avec annulation (Ctrl+Z) — sans dépendance.
  const exec = (command: string, arg?: string): boolean => {
    ref.current?.focus();
    const done = document.execCommand(command, false, arg);
    emit();
    return done;
  };

  // Sélection courante si elle est dans le champ, sinon curseur en fin de champ.
  const currentRange = (): Range | null => {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel) return null;
    if (sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      return sel.getRangeAt(0).cloneRange();
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    return range;
  };

  const selectRange = (range: Range) => {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  // Dans un lien : le bouton le retire. Sinon : ouvre le choix de la cible.
  const onLinkClick = () => {
    const range = currentRange();
    if (!range) return;
    const node = range.startContainer;
    const anchor = (node instanceof Element ? node : node.parentElement)?.closest("a");
    if (anchor && ref.current?.contains(anchor)) {
      const whole = document.createRange();
      whole.selectNodeContents(anchor);
      ref.current.focus();
      selectRange(whole);
      exec("unlink");
      return;
    }
    setLinkForm({ range, linkType: "url", cgid: "", cid: "", link: "" });
  };

  const target = linkForm ? linkTarget(linkForm) : "";
  const insertLink = () => {
    if (!linkForm || !target) return;
    ref.current?.focus();
    selectRange(linkForm.range);
    if (linkForm.range.collapsed) {
      exec("insertHTML", `<a href="${escAttr(target)}" title="${escAttr(target)}">texte du lien</a>`);
    } else {
      exec("createLink", target);
    }
    setLinkForm(null);
  };

  // mousedown empêché : cliquer un bouton ne doit pas faire perdre la sélection du champ.
  const keepSelection = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Gras (Ctrl+B)" onMouseDown={keepSelection} onClick={() => exec("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Italique (Ctrl+I)" onMouseDown={keepSelection} onClick={() => exec("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Lien (dans un lien existant : le retirer)"
          onMouseDown={keepSelection}
          onClick={onLinkClick}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Survoler un lien affiche sa cible
        </span>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onKeyDown={(e) => {
          // Entrée = simple saut de ligne (<br>), comme dans l'ancien champ.
          if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            // Firefox ne connaît pas insertLineBreak.
            if (!exec("insertLineBreak")) exec("insertHTML", "<br>");
          }
          // Pas de souligné : le balisage ne sait pas le garder.
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") e.preventDefault();
        }}
        onPaste={(e) => {
          // Collage en texte brut : pas de mise en forme venue d'ailleurs.
          e.preventDefault();
          exec("insertText", e.clipboardData.getData("text/plain"));
        }}
        className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm wrap-break-word whitespace-pre-wrap outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline"
      />
      {linkForm && (
        <form
          className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 p-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            insertLink();
          }}
        >
          <LinkFields
            linkType={linkForm.linkType}
            cgid={linkForm.cgid}
            cid={linkForm.cid}
            link={linkForm.link}
            onChange={(updates) => setLinkForm({ ...linkForm, ...updates })}
          />
          <Button type="submit" size="sm" className="h-7" disabled={!target}>
            Insérer
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setLinkForm(null)}>
            Annuler
          </Button>
        </form>
      )}
    </div>
  );
}
