"use client";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Commentaire dev d'un item : bordure rouge dès qu'il est renseigné, comme
// sur les autres templates, et repère rouge sur l'item dans l'aperçu.
export function CommentField({ value, onChange }: { value: string | undefined; onChange: (comment: string) => void }) {
  const comment = value ?? "";
  return (
    <div className="space-y-1">
      <span className="text-[11px] text-muted-foreground">commentaire</span>
      <Textarea
        placeholder="commentaire..."
        value={comment}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={cn(
          "min-h-10 resize-none text-sm",
          comment.trim() &&
            "border-red-500 border-l-[3px]! border-l-red-500! focus-visible:ring-2 focus-visible:ring-red-500/40",
        )}
      />
    </div>
  );
}
