"use client";

import { useCallback, useState } from "react";
import { rememberDropOrigin } from "@/lib/post-asset";

// Glisser-déposer un fichier directement sur un bouton d'image : saute
// l'étape "ouvrir la médiathèque" et va droit au popin d'upload/recadrage.
// Le clic garde son comportement existant (ouvre la médiathèque).
export function useFileDrop(onFile: (file: File) => void) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      rememberDropOrigin(file, e.dataTransfer);
      onFile(file);
    },
    [onFile],
  );

  return { isDraggingOver, dropHandlers: { onDragOver, onDragLeave, onDrop } };
}
