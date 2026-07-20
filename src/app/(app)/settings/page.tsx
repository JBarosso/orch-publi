"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Eraser,
  Loader2,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";

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

  const [videoDays, setVideoDays] = useState<string>("");
  const [savedVideoDays, setSavedVideoDays] = useState<number | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);
  const [videoPreview, setVideoPreview] = useState<VideoPurgePreview | null>(null);
  const [loadingVideoPreview, setLoadingVideoPreview] = useState(false);
  const [purgingVideo, setPurgingVideo] = useState(false);

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
    })();
  }, []);

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

  const dirty = savedMonths !== null && Number(months) !== savedMonths;
  const nothingToPurge =
    preview && preview.briefs.length === 0 && preview.assets.length === 0;

  const videoDirty = savedVideoDays !== null && Number(videoDays) !== savedVideoDays;
  const nothingToPurgeVideo = videoPreview && videoPreview.videos.length === 0;

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Paramétrage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rétention des données et maintenance
        </p>
      </div>

      <section className="rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Durée de conservation
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Les briefs <strong>traités </strong> plus anciens que cette durée, et
          les images de la médiathèque anciennes et non utilisées par un brief
          restant, deviennent éligibles à la purge. Aucune suppression n&apos;est
          automatique : la purge est déclenchée manuellement ci-dessous.
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
      </section>

      <section className="mt-6 rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Purge des données expirées
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Lance d&apos;abord l&apos;aperçu (dry-run), vérifie la liste, puis
              purge si tout est correct.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchPreview}
            disabled={loadingPreview}
          >
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

      <section className="mt-6 rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Vidéos MEA v2
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Les vidéos uploadées pour la carte focus MEA v2 sont lourdes. Passé
          cette durée, une vidéo est purgée <strong>automatiquement en tâche
          de fond</strong> (pas besoin de cliquer sur « Purger ») — sauf si
          elle est encore utilisée par une section de brief existante, jamais
          supprimée dans ce cas.
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
  );
}
