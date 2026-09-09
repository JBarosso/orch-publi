"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Brief, BriefSection } from "@/types";

export interface BriefWithSections extends Brief {
  sections: BriefSection[];
}

/** Pure I/O, sans setState : appelable depuis un effet sans rendu en cascade. */
async function loadBrief(briefId: string): Promise<BriefWithSections | null> {
  const res = await fetch(`/api/briefs/${briefId}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Ce qui identifie une section du point de vue "y a-t-il des modifications
 * non sauvegardées" : ni les dates, ni le briefId. C'est notamment ce qui
 * permet de rafraîchir `updatedAt` après une sauvegarde sans rendre le brief
 * à nouveau "sale".
 */
function serializeSections(list: BriefSection[]): string {
  return JSON.stringify(
    list.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      order: s.order,
      visible: s.visible,
      content: s.content,
    })),
  );
}

/**
 * État des sections d'un brief : chargement, édition, drapeau « non
 * sauvegardé » et enregistrement.
 *
 * Le drapeau se calcule en comparant la sérialisation courante à la dernière
 * version enregistrée. Toute modification doit donc passer par
 * `applySections` ou `updateSection` — un `setState` direct laisserait le
 * drapeau désynchronisé, et l'utilisateur perdrait son travail en quittant la
 * page sans avertissement.
 */
export function useBriefSections(briefId: string) {
  const router = useRouter();
  const [brief, setBrief] = useState<BriefWithSections | null>(null);
  const [sections, setSections] = useState<BriefSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const savedSectionsRef = useRef<string>("");

  const receive = useCallback((data: BriefWithSections) => {
    setBrief(data);
    setSections(data.sections);
    savedSectionsRef.current = serializeSections(data.sections);
    setDirty(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadBrief(briefId).then((data) => {
      if (cancelled) return;
      if (!data) {
        toast.error("Brief introuvable");
        router.push("/");
        return;
      }
      receive(data);
    });
    return () => {
      cancelled = true;
    };
  }, [briefId, router, receive]);

  /** Rechargement explicite (après création/suppression d'une section). */
  const refetch = useCallback(async () => {
    setLoading(true);
    const data = await loadBrief(briefId);
    if (!data) {
      toast.error("Brief introuvable");
      router.push("/");
      return;
    }
    receive(data);
  }, [briefId, router, receive]);

  /** Remplace la liste des sections et recalcule le drapeau. */
  const applySections = useCallback(
    (updater: (prev: BriefSection[]) => BriefSection[]) => {
      setSections((prev) => {
        const next = updater(prev);
        setDirty(serializeSections(next) !== savedSectionsRef.current);
        return next;
      });
    },
    [],
  );

  const updateSection = useCallback(
    (
      sectionId: string,
      // Forme fonction quand la mise à jour dépend de la section courante
      // (ex: fusionner dans content sans écraser ses autres clés).
      updates: Partial<BriefSection> | ((section: BriefSection) => Partial<BriefSection>),
    ) => {
      applySections((prev) =>
        prev.map((section) =>
          section.id === sectionId
            ? { ...section, ...(typeof updates === "function" ? updates(section) : updates) }
            : section,
        ),
      );
    },
    [applySections],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const results = await Promise.all(
        sections.map(async (section) => {
          const res = await fetch("/api/sections", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: section.id,
              content: section.content,
              title: section.title,
              visible: section.visible,
              order: section.order,
              // Permet au serveur de refuser d'écraser une modification faite
              // ailleurs depuis l'ouverture du brief (réponse 409).
              updatedAt: section.updatedAt,
            }),
          });
          return { id: section.id, status: res.status, row: res.ok ? await res.json() : null };
        }),
      );

      // fetch ne rejette pas sur un statut d'erreur : sans ce contrôle, une
      // sauvegarde refusée s'afficherait quand même comme réussie.
      if (results.some((r) => r.status === 409)) {
        toast.error(
          "Ce brief a été modifié ailleurs. Recharge la page pour repartir de la version à jour.",
        );
        return;
      }
      if (results.some((r) => !r.row)) {
        toast.error("Erreur lors de la sauvegarde");
        return;
      }

      // Sans ce rafraîchissement, la sauvegarde suivante repartirait d'un
      // updatedAt périmé et serait refusée à tort.
      setSections((prev) =>
        prev.map((s) => {
          const saved = results.find((r) => r.id === s.id);
          return saved?.row ? { ...s, updatedAt: saved.row.updatedAt } : s;
        }),
      );
      savedSectionsRef.current = serializeSections(sections);
      setDirty(false);
      toast.success("Sauvegardé");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }, [sections]);

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  // Fermeture d'onglet / rechargement / navigation externe
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return {
    brief,
    setBrief,
    sections,
    loading,
    saving,
    dirty,
    setDirty,
    applySections,
    updateSection,
    handleSave,
    refetch,
  };
}
