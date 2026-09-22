"use client";

import { Database } from "lucide-react";
import { Input } from "@/components/ui/input";
import { defaultCmsPage, resolveCmsAsset } from "@/lib/cms-asset";
import type { BriefSection, CmsPage } from "@/types";

interface SectionCmsAssetRowProps {
  section: BriefSection;
  pages: CmsPage[];
  onChange: (patch: Partial<Pick<BriefSection, "cmsPageId" | "cmsAssetId">>) => void;
}

/**
 * Page du site visée par la section, et l'asset Salesforce qui en découle.
 * L'identifiant déduit apparaît en indication dans le champ : le remplir
 * remplace la déduction pour cette section seulement.
 */
export function SectionCmsAssetRow({ section, pages, onChange }: SectionCmsAssetRowProps) {
  const fallback = defaultCmsPage(pages);
  const resolved = resolveCmsAsset(
    { type: section.type, cmsPageId: section.cmsPageId ?? null, cmsAssetId: "" },
    pages,
  );
  const placeholder = resolved.assetId
    ? `déduit : ${resolved.assetId}`
    : resolved.page
      ? `rien de défini pour « ${resolved.page.name} »`
      : "choisir une page, ou saisir un ID";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
      <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground">Page CMS</span>
      <select
        value={section.cmsPageId ?? ""}
        onChange={(e) => onChange({ cmsPageId: e.target.value || null })}
        className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none"
      >
        <option value="">{fallback ? `— par défaut : ${fallback.name} —` : "— aucune —"}</option>
        {pages.map((page) => (
          <option key={page.id} value={page.id}>
            {page.name}
          </option>
        ))}
      </select>
      <span className="text-[11px] text-muted-foreground">Asset</span>
      <Input
        value={section.cmsAssetId ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange({ cmsAssetId: e.target.value })}
        title="Laisser vide pour utiliser l'asset défini pour la page dans l'onglet Assets CMS"
        className="h-7 min-w-56 flex-1 font-mono text-xs"
      />
    </div>
  );
}
