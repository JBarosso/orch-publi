"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LOCK_HEARTBEAT_INTERVAL_MS, type LockStatus } from "@/lib/brief-lock";

// Quand on ne tient pas le verrou : fréquence à laquelle on regarde s'il
// s'est libéré (ou si quelqu'un l'a pris entre-temps).
const POLL_INTERVAL_MS = 15_000;
const EXPIRY_WARNING_MS = 5 * 60_000;

/**
 * Verrou d'édition du brief ouvert (principe : cf. src/lib/brief-lock.ts).
 * `status` vaut null tant que l'état n'est pas connu : l'éditeur reste alors
 * en lecture seule, comme pour un brief non verrouillé.
 */
export function useBriefLock(briefId: string) {
  const [status, setStatus] = useState<LockStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `/api/briefs/${briefId}/lock`;
  const mine = status?.state === "mine";

  const lock = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(url, { method: "POST" });
      const next: LockStatus | null = await res.json().catch(() => null);
      if (!next || !("state" in next)) {
        toast.error("Impossible de verrouiller le brief");
        return;
      }
      setStatus(next);
      if (next.state === "other") {
        toast.error("Quelqu'un d'autre vient de verrouiller ce brief.");
      }
    } finally {
      setBusy(false);
    }
  }, [url]);

  const unlock = useCallback(async () => {
    setBusy(true);
    try {
      await fetch(url, { method: "DELETE" });
      setStatus({ state: "free", expiresAt: null });
    } finally {
      setBusy(false);
    }
  }, [url]);

  // Sans le verrou : état chargé puis surveillé, pour voir le brief se libérer.
  useEffect(() => {
    if (mine) return;
    let cancelled = false;
    const load = async () => {
      const res = await fetch(url).catch(() => null);
      if (res?.ok && !cancelled) setStatus(await res.json());
    };
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [url, mine]);

  // Avec le verrou : signe de vie régulier. Un refus signifie qu'il a été
  // perdu (durée maximale atteinte, ou onglet resté trop longtemps muet).
  useEffect(() => {
    if (!mine) return;
    const timer = setInterval(async () => {
      const res = await fetch(url, { method: "PUT" }).catch(() => null);
      const next: LockStatus | null = res ? await res.json().catch(() => null) : null;
      // Coupure réseau passagère : le prochain battement réessaie.
      if (!next || !("state" in next)) return;
      setStatus(next);
      if (next.state !== "mine") {
        toast.error(
          "Votre verrou a expiré : le brief est repassé en lecture seule. Vos modifications restent à l'écran — reverrouillez pour les enregistrer.",
          { duration: 15_000 },
        );
      }
    }, LOCK_HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [url, mine]);

  // Prévenir avant la durée maximale, avec de quoi la repousser : se faire
  // couper en pleine saisie serait pire que le garde-fou lui-même.
  useEffect(() => {
    if (!mine || !status?.expiresAt) return;
    const warnIn = new Date(status.expiresAt).getTime() - Date.now() - EXPIRY_WARNING_MS;
    if (warnIn <= 0) return;
    const timer = setTimeout(() => {
      toast.warning("Votre verrou sur ce brief expire dans 5 minutes.", {
        duration: EXPIRY_WARNING_MS,
        action: { label: "Prolonger", onClick: () => lock() },
      });
    }, warnIn);
    return () => clearTimeout(timer);
  }, [mine, status?.expiresAt, lock]);

  // Libération en quittant le brief : navigation dans l'app (démontage) ou
  // fermeture / rechargement de l'onglet (pagehide). `keepalive` laisse partir
  // la requête même pendant que la page se ferme.
  const mineRef = useRef(false);
  useEffect(() => {
    mineRef.current = mine;
  }, [mine]);
  useEffect(() => {
    const release = () => {
      if (mineRef.current) {
        mineRef.current = false;
        fetch(url, { method: "DELETE", keepalive: true }).catch(() => {});
      }
    };
    window.addEventListener("pagehide", release);
    return () => {
      window.removeEventListener("pagehide", release);
      release();
    };
  }, [url]);

  return { status, mine, busy, lock, unlock };
}
