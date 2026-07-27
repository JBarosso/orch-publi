import type { CustomBlock, CustomBlockType, CustomContent } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function createEmptyBlock(type: CustomBlockType): CustomBlock {
  return {
    id: uuidv4(),
    type,
    text: "",
    imageUrl: "",
    imageId: uuidv4().slice(0, 8),
    imageWeek: null,
    linkType: "cgid",
    cgid: "",
    cid: "",
    link: "",
  };
}

export function createEmptyCustomContent(): CustomContent {
  return { layout: "stack", comment: "", blocks: [] };
}

// Sécurise un contenu venant de la DB ou d'un payload partiel
export function normalizeCustomContent(content: unknown): CustomContent {
  const c = (content ?? {}) as Partial<CustomContent>;
  return {
    layout: c.layout ?? "stack",
    comment: c.comment ?? "",
    blocks: Array.isArray(c.blocks) ? c.blocks : [],
  };
}

// Snapshot indépendant : régénère les ids des blocs et les ids d'image
// (l'imageId sert de nom de fichier à l'export CMS — évite les collisions
// entre deux sections instanciées depuis le même template)
export function cloneBlocksWithNewIds(blocks: CustomBlock[]): CustomBlock[] {
  return blocks.map((block) => ({
    ...block,
    id: uuidv4(),
    imageId: uuidv4().slice(0, 8),
  }));
}

export function validateCustomContent(content: CustomContent): string[] {
  const errors: string[] = [];
  (content.blocks ?? []).forEach((block, i) => {
    if (block.type === "image" && !block.imageUrl) errors.push(`Bloc ${i + 1} (image): image requise`);
    if ((block.type === "title" || block.type === "button") && !block.text.trim()) {
      errors.push(`Bloc ${i + 1} (${CUSTOM_BLOCK_LABELS_LOWER[block.type]}): texte requis`);
    }
  });
  return errors;
}

const CUSTOM_BLOCK_LABELS_LOWER: Record<string, string> = { title: "titre", button: "bouton" };
