"use client";

import { Loader2, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LockStatus } from "@/lib/brief-lock";

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

interface BriefLockButtonProps {
  status: LockStatus | null;
  busy: boolean;
  /** Attire l'œil sur le bouton après une tentative d'édition sans verrou. */
  highlight?: boolean;
  onLock: () => void;
  onUnlock: () => void;
}

const HIGHLIGHT = "ring-2 ring-primary ring-offset-2 animate-pulse";

/** Verrou d'édition du brief, affiché à côté de son statut. */
export function BriefLockButton({ status, busy, highlight = false, onLock, onUnlock }: BriefLockButtonProps) {
  if (!status) {
    return (
      <Button variant="outline" size="sm" className="h-7 rounded-lg px-2 text-xs" disabled>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
    );
  }

  if (status.state === "mine") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onUnlock}
        disabled={busy}
        title={status.expiresAt ? `Verrou libéré automatiquement à ${clock(status.expiresAt)} au plus tard` : undefined}
        className="h-7 rounded-lg border-emerald-300 bg-emerald-50 px-2 text-xs text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
      >
        <Lock className="mr-1 h-3.5 w-3.5" />
        Verrouillé par vous
        {status.expiresAt && (
          <span className="ml-1 font-normal text-emerald-600/80">· {clock(status.expiresAt)}</span>
        )}
      </Button>
    );
  }

  if (status.state === "other") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title={
          status.expiresAt
            ? `En cours d'édition par quelqu'un d'autre — libéré dès qu'il quitte le brief, et au plus tard à ${clock(status.expiresAt)}`
            : "En cours d'édition par quelqu'un d'autre"
        }
        className={cn(
          "h-7 rounded-lg border-amber-300 bg-amber-50 px-2 text-xs text-amber-700 disabled:opacity-100",
          highlight && HIGHLIGHT,
        )}
      >
        <Lock className="mr-1 h-3.5 w-3.5" />
        Verrouillé par un autre
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onLock}
      disabled={busy}
      title="Verrouiller le brief pour le modifier : les autres le verront en lecture seule"
      className={cn("h-7 rounded-lg px-2 text-xs", highlight && HIGHLIGHT)}
    >
      {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <LockOpen className="mr-1 h-3.5 w-3.5" />}
      Verrouiller
    </Button>
  );
}
