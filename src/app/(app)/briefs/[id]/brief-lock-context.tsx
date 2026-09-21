"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useBriefLock } from "./use-brief-lock";

// Le verrou vit dans la mise en page commune au brief et à son export (cf.
// layout.tsx), pas dans la page du brief : Next garde cette mise en page
// montée quand on passe de l'une à l'autre. Aller sur l'export ne libère donc
// pas le verrou (le signe de vie continue), tandis que quitter le brief pour
// n'importe quel autre onglet démonte la mise en page, et le libère.

type BriefLock = ReturnType<typeof useBriefLock>;

const BriefLockContext = createContext<BriefLock | null>(null);

function BriefLockState({ briefId, children }: { briefId: string; children: ReactNode }) {
  const lock = useBriefLock(briefId);
  return <BriefLockContext.Provider value={lock}>{children}</BriefLockContext.Provider>;
}

export function BriefLockProvider({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  // Clé = brief : passer d'un brief à un autre repart d'un état vierge (et
  // libère le verrou du précédent au démontage), au lieu de croire un instant
  // qu'on tient déjà le verrou du nouveau.
  return (
    <BriefLockState key={id} briefId={id}>
      {children}
    </BriefLockState>
  );
}

export function useBriefLockContext(): BriefLock {
  const lock = useContext(BriefLockContext);
  if (!lock) throw new Error("useBriefLockContext doit être utilisé sous BriefLockProvider");
  return lock;
}
