// Purge automatique des vidéos MEA v2 expirées (elles sont lourdes) — tourne
// en tâche de fond tant que le serveur Next.js vit, sans dépendre d'un clic
// ni d'un cron externe. Durée configurable dans Paramétrage (/settings).
// register() est appelé une seule fois au démarrage du serveur (doc Next.js).

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
const FIRST_RUN_DELAY_MS = 60 * 1000; // laisse le serveur finir de démarrer

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getVideoRetentionDays, executeVideoPurge } = await import("@/lib/retention");

  const runPurge = async () => {
    try {
      const days = await getVideoRetentionDays();
      const result = await executeVideoPurge(days);
      if (result.deletedVideos > 0) {
        console.log(
          `[video-retention] ${result.deletedVideos} vidéo(s) MEA v2 expirée(s) purgée(s) (> ${days}j)`,
        );
      }
    } catch (err) {
      console.error("[video-retention] échec de la purge automatique :", err);
    }
  };

  const firstRun = setTimeout(() => {
    runPurge();
    const interval = setInterval(runPurge, CHECK_INTERVAL_MS);
    interval.unref?.();
  }, FIRST_RUN_DELAY_MS);
  firstRun.unref?.();
}
