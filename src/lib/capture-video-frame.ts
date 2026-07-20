// Capture la 1ère frame d'un fichier vidéo côté navigateur (aucune dépendance
// serveur type ffmpeg). Sert de point de départ éditable pour la vignette
// (poster) de la carte focus MEA v2 — l'utilisateur peut ensuite recadrer ou
// remplacer l'image comme n'importe quel upload.
export function captureVideoFirstFrame(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    const capture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 600;
      canvas.height = video.videoHeight || 700;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("No 2d context"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      cleanup();
      resolve(dataUrl);
    };

    video.onloadeddata = () => {
      // Certains navigateurs (Chrome) ne peuvent dessiner une frame sur le
      // canvas qu'après un cycle play/pause explicite.
      video
        .play()
        .then(() => {
          video.pause();
          video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
        })
        .catch(() => {
          video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
        });
    };
    video.onseeked = capture;
    video.onerror = () => {
      cleanup();
      reject(new Error("Impossible de lire cette vidéo"));
    };
  });
}

// Convertit une data URL (issue de captureVideoFirstFrame) en File, pour la
// réinjecter dans ImageUploadDialog via sa prop `initialFile` existante.
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}
