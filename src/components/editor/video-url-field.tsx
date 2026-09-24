"use client";

import { Video } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Les vidéos ne sont plus hébergées par l'outil : trop lourdes à stocker et
 * surtout à servir. On ne garde que leur adresse, que l'intégrateur ira
 * chercher lui-même, et une vignette extraite du fichier sans jamais l'envoyer
 * (la première image est capturée dans le navigateur, cf. capture-video-frame).
 */
export function VideoUrlField({
  url,
  onChange,
  onPosterFromFile,
}: {
  url: string;
  onChange: (url: string) => void;
  /** Ouvre le sélecteur de fichier pour fabriquer la vignette, sans upload. */
  onPosterFromFile: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5 rounded-md border border-dashed p-1.5">
      <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        <Video className="h-3 w-3" />
        Vidéo — non hébergée ici
      </span>
      <Input
        value={url}
        onChange={(e) => onChange(e.target.value)}
        placeholder="URL de la vidéo (SharePoint, Drive…)"
        className="h-7 text-[10px]"
        title="Adresse où l'intégrateur téléchargera la vidéo : elle apparaît sur la page Export, avec le chemin CMS où la déposer"
      />
      <button type="button" onClick={onPosterFromFile} className="text-left text-[10px] text-primary hover:underline">
        Générer la vignette depuis un fichier vidéo
      </button>
    </div>
  );
}
