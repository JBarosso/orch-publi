/**
 * Vidéo d'une section : l'outil ne l'héberge plus, il n'en garde que
 * l'adresse. L'intégrateur la télécharge lui-même et la dépose dans le CMS au
 * chemin attendu par le HTML exporté — d'où ces deux informations côte à côte
 * sur la page Export.
 */
export interface VideoEntry {
  /** Ce que la vidéo occupe dans la section (ex: « diapositive 2 »). */
  slot: string;
  /** Adresse saisie dans l'éditeur ; vide si personne ne l'a renseignée. */
  sourceUrl: string;
  /** Chemin CMS où déposer le fichier, extension comprise. */
  cmsPath: string;
}
