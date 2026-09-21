// Logo marque, partagé par les templates qui en portent un (MEA v2, slider) :
// choix entre un chemin CMS saisi à la main et une image uploadée, largeur
// d'affichage réglable. Le nommage du fichier exporté reste propre à chaque
// template (son dossier CMS n'est pas construit de la même façon).

export const DEFAULT_BRAND_LOGO_WIDTH = 100;

/**
 * Champs communs. Optionnels sauf `showBrandLogo` : les contenus enregistrés
 * avant l'ajout de l'image et de la largeur ne les ont pas, et les templates
 * sans normalisation de contenu (slider) les lisent tels quels.
 */
export interface BrandLogoFields {
  showBrandLogo: boolean;
  brandLogoSource?: "path" | "image";
  brandLogoPath: string;
  brandLogoUrl?: string;
  brandLogoWidth?: number;
}

export function usesUploadedBrandLogo(logo: BrandLogoFields): boolean {
  return logo.brandLogoSource === "image" && !!logo.brandLogoUrl;
}

/**
 * Extension du logo exporté, déduite du fichier choisi : un SVG part tel quel
 * (vectoriel conservé), tout le reste est normalisé en PNG par le ZIP. Le HTML
 * et l'archive doivent tomber d'accord, d'où cette unique source.
 */
export function brandLogoExtension(logo: BrandLogoFields): "svg" | "png" {
  return /\.svg(\?|$)/i.test(logo.brandLogoUrl ?? "") ? "svg" : "png";
}

export function brandLogoWidth(logo: BrandLogoFields): number {
  return logo.brandLogoWidth || DEFAULT_BRAND_LOGO_WIDTH;
}
