"use client";

import { Button } from "@/components/ui/button";
import { Send, RotateCcw, CheckCircle2 } from "lucide-react";
import type { BriefStatus } from "@/types";

interface StatusActionsProps {
  status: BriefStatus;
  onChange: (newStatus: BriefStatus) => void;
}

export function StatusActions({ status, onChange }: StatusActionsProps) {
  return (
    <div className="flex gap-1.5">
      {status === "draft" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange("published")}
          className="rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Publier
        </Button>
      )}
      {status === "published" && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange("treated")}
            className="rounded-lg border-sky-200 text-sky-700 hover:bg-sky-50"
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Marquer traité
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange("draft")}
            className="rounded-lg"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Brouillon
          </Button>
        </>
      )}
      {status === "treated" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange("draft")}
          className="rounded-lg"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Repasser en brouillon
        </Button>
      )}
    </div>
  );
}
