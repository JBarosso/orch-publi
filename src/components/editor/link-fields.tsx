"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type LinkType = "cgid" | "cid" | "url";

interface LinkFieldsProps<T extends string> {
  linkType: T;
  cgid: string;
  cid: string;
  link: string;
  onChange: (updates: {
    linkType?: T;
    cgid?: string;
    cid?: string;
    link?: string;
  }) => void;
  /** Option "none" en plus (bandeau global header : texte non cliquable) */
  allowNone?: boolean;
  cgidPlaceholder?: string;
  cidPlaceholder?: string;
  selectClassName?: string;
  inputClassName?: string;
}

/**
 * Trio cgid/cid/URL partagé par tous les éditeurs de template : un Select du
 * type de lien + l'input correspondant. Les tailles par défaut correspondent
 * aux lignes compactes (h-7) ; les éditeurs plus aérés passent leurs classes.
 */
export function LinkFields<T extends string = LinkType>({
  linkType,
  cgid,
  cid,
  link,
  onChange,
  allowNone = false,
  cgidPlaceholder = "ex: outlet",
  cidPlaceholder = "ex: aide-faq",
  selectClassName = "h-7 w-20 shrink-0 text-xs",
  inputClassName = "h-7 text-xs flex-1",
}: LinkFieldsProps<T>) {
  const items: Record<string, string> = allowNone
    ? { cgid: "cgid", cid: "cid", url: "URL", none: "Aucun (texte simple)" }
    : { cgid: "cgid", cid: "cid", url: "URL" };

  return (
    <>
      <Select
        value={linkType}
        items={items}
        onValueChange={(v) => v && onChange({ linkType: v as T })}
      >
        <SelectTrigger className={selectClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {linkType === "cgid" ? (
        <Input
          placeholder={cgidPlaceholder}
          value={cgid}
          onChange={(e) => onChange({ cgid: e.target.value })}
          className={inputClassName}
        />
      ) : linkType === "cid" ? (
        <Input
          placeholder={cidPlaceholder}
          value={cid}
          onChange={(e) => onChange({ cid: e.target.value })}
          className={inputClassName}
        />
      ) : linkType === "url" ? (
        <Input
          placeholder="https://..."
          value={link}
          onChange={(e) => onChange({ link: e.target.value })}
          className={inputClassName}
        />
      ) : (
        <span className="text-[10px] text-muted-foreground">
          Message non cliquable (affiché dans un &lt;span&gt;)
        </span>
      )}
    </>
  );
}
