import type { ArianeLink, ArianeContent } from "@/types";

export function createEmptyArianeLink(id: string): ArianeLink {
  return { id, label: "", linkType: "cgid", cgid: "", cid: "", link: "" };
}

export function createEmptyArianeContent(): ArianeContent {
  return { title: "", comment: "", links: [] };
}

export function validateArianeContent(content: ArianeContent): string[] {
  const errors: string[] = [];
  if (!content.title.trim()) errors.push("Fil d'ariane: Titre requis");
  content.links.forEach((link, i) => {
    if (!link.label.trim()) errors.push(`Fil d'ariane, lien ${i + 1}: Libellé requis`);
  });
  return errors;
}
