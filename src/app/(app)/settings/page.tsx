"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Eraser,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { HeaderColor } from "@/lib/header-colors";
import type { ScheduledPurgeReport } from "@/lib/retention";
import { SECTION_TYPE_OPTIONS } from "@/lib/section-types";
import type { SectionType } from "@/types";

interface PurgePreview {
  cutoff: string;
  months: number;
  briefs: { id: string; slug: string; createdAt: string }[];
  assets: { id: string; url: string; label: string; createdAt: string }[];
}

interface VideoPurgePreview {
  cutoff: string;
  days: number;
  videos: { id: string; url: string; label: string; createdAt: string }[];
}

export default function SettingsPage() {
  const [months, setMonths] = useState<string>("");
  const [savedMonths, setSavedMonths] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PurgePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [purging, setPurging] = useState(false);
  const [autoPurge, setAutoPurge] = useState(false);
  const [savingAutoPurge, setSavingAutoPurge] = useState(false);
  const [cronConfigured, setCronConfigured] = useState(true);
  const [lastScheduledPurge, setLastScheduledPurge] = useState<ScheduledPurgeReport | null>(null);

  const [videoDays, setVideoDays] = useState<string>("");
  const [savedVideoDays, setSavedVideoDays] = useState<number | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);
  const [videoPreview, setVideoPreview] = useState<VideoPurgePreview | null>(null);
  const [loadingVideoPreview, setLoadingVideoPreview] = useState(false);
  const [purgingVideo, setPurgingVideo] = useState(false);

  const [colors, setColors] = useState<HeaderColor[]>([]);
  const [savedColors, setSavedColors] = useState<HeaderColor[] | null>(null);
  const [savingColors, setSavingColors] = useState(false);

  // La clé enregistrée n'est jamais renvoyée par l'API : le champ reste vide
  // et ne sert qu'à en poser une nouvelle, l'indice affichant celle en place.
  const [apiKey, setApiKey] = useState("");
  const [keyHint, setKeyHint] = useState("");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  // Durée maximale d'un verrou de brief, enregistrée en minutes ; saisie dans
  // l'unité choisie, en heures par défaut quand la valeur tombe juste.
  const [lockValue, setLockValue] = useState("");
  const [lockUnit, setLockUnit] = useState<"minutes" | "hours">("hours");
  const [savedLockMinutes, setSavedLockMinutes] = useState<number | null>(null);
  const [savingLock, setSavingLock] = useState(false);
  const lockMinutes = Number(lockValue) * (lockUnit === "hours" ? 60 : 1);

  // Types de section masqués du menu de création d'un brief ; null tant que
  // non chargé, pour ne pas afficher des cases fausses.
  const [hiddenTypes, setHiddenTypes] = useState<SectionType[] | null>(null);

  const toggleSectionType = async (type: SectionType, visible: boolean) => {
    if (!hiddenTypes) return;
    const previous = hiddenTypes;
    const next = visible ? hiddenTypes.filter((t) => t !== type) : [...hiddenTypes, type];
    setHiddenTypes(next);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiddenSectionTypes: next }),
    });
    if (!res.ok) {
      setHiddenTypes(previous);
      toast.error("Impossible d'enregistrer les templates proposés");
    }
  };

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) {
        toast.error("Impossible de charger le paramétrage");
        return;
      }
      const data = await res.json();
      setMonths(String(data.retentionMonths));
      setSavedMonths(data.retentionMonths);
      setVideoDays(String(data.videoRetentionDays));
      setSavedVideoDays(data.videoRetentionDays);
      setColors(data.headerColors ?? []);
      setSavedColors(data.headerColors ?? []);
      setAutoPurge(data.autoPurgeEnabled === true);
      setCronConfigured(data.cronConfigured === true);
      setLastScheduledPurge(data.lastScheduledPurge ?? null);
      setKeyConfigured(data.openaiKeyConfigured === true);
      setKeyHint(data.openaiKeyHint ?? "");
      setHiddenTypes(data.hiddenSectionTypes ?? []);
      const minutes: number = data.lockMaxMinutes;
      setSavedLockMinutes(minutes);
      if (minutes % 60 === 0) {
        setLockValue(String(minutes / 60));
        setLockUnit("hours");
      } else {
        setLockValue(String(minutes));
        setLockUnit("minutes");
      }
    })();
  }, []);

  const saveLockDuration = async () => {
    setSavingLock(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockMaxMinutes: lockMinutes }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      setSavedLockMinutes(data.lockMaxMinutes);
      toast.success("Durée de verrouillage enregistrée");
    } finally {
      setSavingLock(false);
    }
  };

  const saveApiKey = async (key: string) => {
    setSavingKey(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: key }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      setKeyConfigured(data.openaiKeyConfigured);
      setKeyHint(data.openaiKeyHint ?? "");
      setApiKey("");
      toast.success(key ? "Clé API enregistrée" : "Clé API supprimée");
    } finally {
      setSavingKey(false);
    }
  };

  const fetchPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/retention/purge");
      if (!res.ok) {
        toast.error("Impossible de calculer l'aperçu");
        return;
      }
      setPreview(await res.json());
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const fetchVideoPreview = useCallback(async () => {
    setLoadingVideoPreview(true);
    try {
      const res = await fetch("/api/retention/purge-videos");
      if (!res.ok) {
        toast.error("Impossible de calculer l'aperçu vidéo");
        return;
      }
      setVideoPreview(await res.json());
    } finally {
      setLoadingVideoPreview(false);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionMonths: Number(months) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      setSavedMonths(data.retentionMonths);
      toast.success("Durée de rétention enregistrée");
      // La durée a changé : l'aperçu affiché ne correspond plus
      setPreview(null);
    } finally {
      setSaving(false);
    }
  };

  const handlePurge = async () => {
    if (!preview) return;
    const summary = `${preview.briefs.length} brief(s) et ${preview.assets.length} image(s)`;
    if (
      !confirm(
        `Supprimer définitivement ${summary} ?\n\nCette action est irréversible.`,
      )
    )
      return;

    setPurging(true);
    try {
      const res = await fetch("/api/retention/purge", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erreur lors de la purge");
        return;
      }
      toast.success(
        `Purge effectuée : ${data.deletedBriefs} brief(s), ${data.deletedAssets} image(s) supprimé(s)`,
      );
      fetchPreview();
    } finally {
      setPurging(false);
    }
  };

  const handleAutoPurgeChange = async (enabled: boolean) => {
    if (
      enabled &&
      !confirm(
        `Chaque nuit, les briefs traités de plus de ${savedMonths} mois et les images expirées non utilisées seront supprimés définitivement, sans aperçu ni confirmation.\n\nActiver la purge automatique ?`,
      )
    )
      return;

    setSavingAutoPurge(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoPurgeEnabled: enabled }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      setAutoPurge(data.autoPurgeEnabled);
      toast.success(enabled ? "Purge automatique activée" : "Purge automatique désactivée");
    } finally {
      setSavingAutoPurge(false);
    }
  };

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoRetentionDays: Number(videoDays) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      setSavedVideoDays(data.videoRetentionDays);
      toast.success("Durée de rétention vidéo enregistrée");
      setVideoPreview(null);
    } finally {
      setSavingVideo(false);
    }
  };

  const handlePurgeVideo = async () => {
    if (!videoPreview) return;
    const summary = `${videoPreview.videos.length} vidéo(s)`;
    if (
      !confirm(`Supprimer définitivement ${summary} ?\n\nCette action est irréversible.`)
    )
      return;

    setPurgingVideo(true);
    try {
      const res = await fetch("/api/retention/purge-videos", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erreur lors de la purge");
        return;
      }
      toast.success(`Purge effectuée : ${data.deletedVideos} vidéo(s) supprimée(s)`);
      fetchVideoPreview();
    } finally {
      setPurgingVideo(false);
    }
  };

  const updateColor = (index: number, updates: Partial<HeaderColor>) => {
    setColors((prev) => prev.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };
  const addColor = () => setColors((prev) => [...prev, { name: "", hex: "#000000" }]);
  const removeColor = (index: number) => setColors((prev) => prev.filter((_, i) => i !== index));

  const handleSaveColors = async () => {
    setSavingColors(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headerColors: colors }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      setSavedColors(data.headerColors);
      toast.success("Couleurs recommandées enregistrées");
    } finally {
      setSavingColors(false);
    }
  };

  const dirty = savedMonths !== null && Number(months) !== savedMonths;
  const nothingToPurge =
    preview && preview.briefs.length === 0 && preview.assets.length === 0;

  const videoDirty = savedVideoDays !== null && Number(videoDays) !== savedVideoDays;
  const nothingToPurgeVideo = videoPreview && videoPreview.videos.length === 0;

  const colorsDirty = savedColors !== null && JSON.stringify(colors) !== JSON.stringify(savedColors);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Paramétrage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Templates, rétention des données et maintenance
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
      <section className="rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Templates proposés</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Types de section proposés à la création dans un brief. Décocher un type le retire du
          menu ; les sections déjà créées restent éditables et exportables.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
          {SECTION_TYPE_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hiddenTypes !== null && !hiddenTypes.includes(value)}
                disabled={hiddenTypes === null}
                onChange={(e) => toggleSectionType(value, e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Verrouillage des briefs
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Une personne verrouille un brief pour le modifier ; les autres le voient en lecture
          seule, sans pouvoir reprendre la main. Le verrou se libère en quittant le brief, et
          dans tous les cas au bout de cette durée, comptée depuis sa pose — pour qu&apos;un
          onglet oublié ne bloque pas un brief indéfiniment. On est prévenu 5 minutes avant,
          avec la possibilité de le prolonger.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lock-duration">Durée maximale</Label>
            <div className="flex items-center gap-2">
              <Input
                id="lock-duration"
                type="number"
                min={1}
                value={lockValue}
                onChange={(e) => setLockValue(e.target.value)}
                className="w-24"
              />
              <select
                value={lockUnit}
                onChange={(e) => setLockUnit(e.target.value as "minutes" | "hours")}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none"
              >
                <option value="minutes">minutes</option>
                <option value="hours">heures</option>
              </select>
            </div>
          </div>
          <Button
            onClick={saveLockDuration}
            disabled={savingLock || savedLockMinutes === null || lockMinutes === savedLockMinutes}
          >
            {savingLock ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Couleurs recommandées — Global header
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Proposées en priorité dans l&apos;éditeur de section Global header,
          en plus du sélecteur de couleur libre.
        </p>
        <div className="mt-4 space-y-2">
          {colors.map((color, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={color.hex}
                onChange={(e) => updateColor(i, { hex: e.target.value })}
                className="h-8 w-10 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
              />
              <Input
                placeholder="Nom (ex: Orchestra)"
                value={color.name}
                onChange={(e) => updateColor(i, { name: e.target.value })}
                className="min-w-0 flex-1"
              />
              <Input
                value={color.hex}
                onChange={(e) => updateColor(i, { hex: e.target.value })}
                placeholder="#RRGGBB"
                className="w-28 shrink-0 font-mono text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeColor(i)}
                className="h-8 w-8 shrink-0 text-muted-foreground/50 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <Button variant="outline" size="sm" onClick={addColor}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Ajouter une couleur
            </Button>
            <Button onClick={handleSaveColors} disabled={!colorsDirty || savingColors} size="sm">
              {savingColors ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Complétion IA des images
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Permet de compléter les zones vides laissées par un recadrage dézoomé,
          directement au moment de l&apos;upload. Nécessite une clé API OpenAI
          (plateforme facturée à l&apos;usage, de l&apos;ordre de quelques
          centimes par image). Sans clé, l&apos;option n&apos;apparaît pas dans
          la fenêtre d&apos;upload.
        </p>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="openai-key">
            Clé API OpenAI
            {keyConfigured && (
              <span className="ml-2 font-normal text-emerald-600">
                enregistrée {keyHint}
              </span>
            )}
          </Label>
          <Input
            id="openai-key"
            type="password"
            autoComplete="off"
            placeholder={keyConfigured ? "Saisir une nouvelle clé pour la remplacer" : "sk-..."}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => saveApiKey(apiKey.trim())} disabled={!apiKey.trim() || savingKey}>
            {savingKey ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Enregistrer
          </Button>
          {keyConfigured && (
            <Button
              variant="outline"
              onClick={() => saveApiKey("")}
              disabled={savingKey}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Supprimer
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Conservation des briefs et images
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Les briefs <strong>traités </strong> plus anciens que cette durée, et
          les images de la médiathèque anciennes et non utilisées par un brief
          restant, deviennent éligibles à la purge, déclenchée manuellement
          ci-dessous ou chaque nuit si la purge automatique est activée.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="retention-months">Durée (mois)</Label>
            <Input
              id="retention-months"
              type="number"
              min={1}
              max={120}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              className="w-32"
            />
          </div>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>

        <div className="mt-5 flex items-start justify-between gap-3 border-t border-border/60 pt-4">
          <div>
            <Label htmlFor="auto-purge">Purge automatique chaque nuit</Label>
            {!cronConfigured && (
              <p className="mt-1 text-xs text-amber-600">
                CRON_SECRET n&apos;est pas défini sur ce déploiement : le passage
                automatique est refusé et ne tournera pas.
              </p>
            )}
            {lastScheduledPurge?.error ? (
              <p className="mt-1 text-xs text-red-600">
                Dernier passage le{" "}
                {new Date(lastScheduledPurge.ranAt).toLocaleString("fr-FR")} : échec —{" "}
                {lastScheduledPurge.error}
              </p>
            ) : lastScheduledPurge ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Dernier passage le{" "}
                {new Date(lastScheduledPurge.ranAt).toLocaleString("fr-FR")} :{" "}
                {lastScheduledPurge.briefPurgeEnabled
                  ? `${lastScheduledPurge.deletedBriefs} brief(s), ${lastScheduledPurge.deletedAssets} image(s) et `
                  : ""}
                {lastScheduledPurge.deletedVideos} vidéo(s) supprimé(s)
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Aucun passage automatique enregistré pour l&apos;instant.
              </p>
            )}
          </div>
          <Switch
            id="auto-purge"
            checked={autoPurge}
            disabled={savingAutoPurge || savedMonths === null}
            onCheckedChange={handleAutoPurgeChange}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">
            Lance d&apos;abord l&apos;aperçu (dry-run), vérifie la liste, puis
            purge si tout est correct.
          </p>
          <Button variant="outline" onClick={fetchPreview} disabled={loadingPreview} className="shrink-0">
            {loadingPreview ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Aperçu de la purge
          </Button>
        </div>

        {preview && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Seuil : données créées avant le{" "}
              <strong>
                {new Date(preview.cutoff).toLocaleDateString("fr-FR")}
              </strong>{" "}
              ({preview.months} mois)
            </p>

            {nothingToPurge ? (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Rien à purger — toutes les données sont dans la période de
                rétention.
              </p>
            ) : (
              <>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Briefs ({preview.briefs.length})
                  </h3>
                  {preview.briefs.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">Aucun</p>
                  ) : (
                    <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto text-sm">
                      {preview.briefs.map((b) => (
                        <li
                          key={b.id}
                          className="flex justify-between rounded-md bg-muted/40 px-3 py-1.5"
                        >
                          <span className="font-mono text-xs">{b.slug}</span>
                          <span className="text-xs text-muted-foreground">
                            créé le{" "}
                            {new Date(b.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Images médiathèque ({preview.assets.length})
                  </h3>
                  {preview.assets.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">Aucune</p>
                  ) : (
                    <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto text-sm">
                      {preview.assets.map((a) => (
                        <li
                          key={a.id}
                          className="flex justify-between rounded-md bg-muted/40 px-3 py-1.5"
                        >
                          <span className="truncate text-xs">
                            {a.label || a.url}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handlePurge}
                  disabled={purging}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {purging ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Eraser className="mr-1.5 h-4 w-4" />
                  )}
                  Purger maintenant
                </Button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Vidéos MEA v2
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Les vidéos de la carte focus MEA v2 sont lourdes. Passé cette durée, une vidéo est purgée
          <strong> automatiquement chaque nuit</strong> (pas besoin de cliquer
          sur « Purger ») — sauf si elle est encore utilisée par une section de
          brief existante, jamais supprimée dans ce cas.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="video-retention-days">Durée (jours)</Label>
            <Input
              id="video-retention-days"
              type="number"
              min={1}
              max={365}
              value={videoDays}
              onChange={(e) => setVideoDays(e.target.value)}
              className="w-32"
            />
          </div>
          <Button onClick={handleSaveVideo} disabled={!videoDirty || savingVideo}>
            {savingVideo ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">
            Aperçu ou purge immédiate, sans attendre le prochain passage
            automatique.
          </p>
          <Button
            variant="outline"
            onClick={fetchVideoPreview}
            disabled={loadingVideoPreview}
            className="shrink-0"
          >
            {loadingVideoPreview ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Aperçu de la purge
          </Button>
        </div>

        {videoPreview && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Seuil : vidéos créées avant le{" "}
              <strong>
                {new Date(videoPreview.cutoff).toLocaleDateString("fr-FR")}
              </strong>{" "}
              ({videoPreview.days} jours)
            </p>

            {nothingToPurgeVideo ? (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Rien à purger — aucune vidéo expirée non utilisée.
              </p>
            ) : (
              <>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vidéos ({videoPreview.videos.length})
                  </h3>
                  <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto text-sm">
                    {videoPreview.videos.map((v) => (
                      <li
                        key={v.id}
                        className="flex justify-between rounded-md bg-muted/40 px-3 py-1.5"
                      >
                        <span className="truncate text-xs">
                          {v.label || v.url}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(v.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  variant="outline"
                  onClick={handlePurgeVideo}
                  disabled={purgingVideo}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {purgingVideo ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Eraser className="mr-1.5 h-4 w-4" />
                  )}
                  Purger maintenant
                </Button>
              </>
            )}
          </div>
        )}
      </section>

      </div>
    </div>
  );
}
