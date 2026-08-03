"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Bouton "Copier le code" partagé par les pages d'export (simple et groupé). */
export function CopyCodeButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Code copié dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" className="rounded-lg" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
          Copié
        </>
      ) : (
        <>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copier le code
        </>
      )}
    </Button>
  );
}
