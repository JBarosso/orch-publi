// Démo publique : chemin secret, sans base ni login. Tout ce qui la concerne
// vit dans ce dossier (src/app/demo-9ec02e0f). Renommer le chemin = renommer
// le dossier, DEMO_BASE ci-dessous et l'entrée de PUBLIC_PATHS dans src/proxy.ts.
// Supprimer la démo = supprimer le dossier et cette même entrée.
export const DEMO_BASE = "/demo-9ec02e0f";

export type DemoImageKind = "quickaccess" | "mea";

export interface DemoImage {
  url: string;
  label: string;
  kind: DemoImageKind;
}

const BLOB = "https://ye735xyplanggrof.public.blob.vercel-storage.com";

// Visuels réels de la médiathèque, référencés par URL.
// ponytail: seul ce code les connaît, pas la base — la purge de rétention les
// jugera orphelins passé la durée de conservation (24 mois par défaut) ; les
// copier dans public/ si la démo doit vivre plus longtemps.
export const DEMO_GALLERY: DemoImage[] = [
  { kind: "quickaccess", label: "T-shirts", url: `${BLOB}/18d8a294-5f72-40a2-bacd-b344ecd58365-iGeSmLypZ7w6tlK2mB1sms1ocrxj8O.jpg` },
  { kind: "quickaccess", label: "Pyjamas", url: `${BLOB}/c65de5f8-19b5-4970-899e-7f5592de7145-rQTAG4QmUdT1XGZGlmlyJYhibUz5oT.jpg` },
  { kind: "quickaccess", label: "Sweats", url: `${BLOB}/33b7a19e-1fe8-4e21-a61b-e63de64139d7-f9NwidHmEyK4rrtLLueDJjOWUZjPzT.jpg` },
  { kind: "quickaccess", label: "Pantalons", url: `${BLOB}/a65b85c1-0cbf-4944-89d3-1b8e0c049407-kfvZnbgahnDWcWaeTwTmZMDpoM2Vyq.jpg` },
  { kind: "quickaccess", label: "Robots", url: `${BLOB}/d3511ff3-4dd1-48ef-b0fa-daf6e341d555-UlDiCepUFBSGffu73UqyKs8SDw9CJJ.jpg` },
  { kind: "quickaccess", label: "Poussettes", url: `${BLOB}/4e3babbd-c6d2-406b-96bf-9cd4b7ce590a-i6q84WpQcQw6H1Ks4Jxf1gd0nChOd6.jpg` },
  { kind: "quickaccess", label: "Chaises hautes", url: `${BLOB}/9f68bd81-e1b5-4f2e-9e84-8303e5d88233-z1ihLcVFJTg0bVbTaDP30LPHMMolUs.jpg` },
  { kind: "quickaccess", label: "Sièges auto", url: `${BLOB}/f8993138-afd3-4b58-94dd-cbbf76ba6ed9-TEiAHPe4KBAATNqyHZzIshRlPqUkRZ.jpg` },
  { kind: "quickaccess", label: "Boîtes à histoire", url: `${BLOB}/399afb04-8018-4daf-8958-4fb5ba29b93e-mwnJKtzhlh0Y827y8Mt1yYnOhMngDw.jpg` },
  { kind: "quickaccess", label: "Ensembles", url: `${BLOB}/a6f7780e-bf9c-4e0b-bba2-8beac7654310-x0DcDx072pHUbhKCcstEr4ynpaWJRg.jpg` },
  { kind: "quickaccess", label: "Robes", url: `${BLOB}/3f2f7db7-db68-4864-bded-2664d133477f-eY6Z2eFoEQeVyUFB7AFBg8hMIh6Mk3.jpg` },
  { kind: "quickaccess", label: "Dors-bien", url: `${BLOB}/d260558c-302a-4454-b5a9-00675b83f0b6-oXYqcMbVGryoIRuEwmgIYRi6kGqsH2.jpg` },

  { kind: "mea", label: "Literie", url: `${BLOB}/13677f26-634d-4bcd-badc-37a2e45b2653-xQRJhoaXopoLFSto300zqy4y7YXTMu.jpg` },
  { kind: "mea", label: "Gigoteuses", url: `${BLOB}/3aaaccbe-2b2d-4b44-8559-a414eb6ed404-rB9H66voQ1Y1TqeF1yTY9qlEz76stZ.jpg` },
  { kind: "mea", label: "Chaise haute", url: `${BLOB}/0c9bc8ee-ada1-4990-8c61-c89d61904619-Sqy02tbCrvW83aPz8SXoKjy4odjyVO.jpg` },
  { kind: "mea", label: "Collection Pluie", url: `${BLOB}/4f48532b-c65b-40fd-9612-27fc7efe2387-RowL0vdvPolRJ1uGy4QUrSrVXPD5QE.jpg` },
  { kind: "mea", label: "Collection Denim", url: `${BLOB}/77a32077-689a-4104-855b-dd5d0f492f33-DavVvpwSv3xonXVVetiufht2Vyo7se.jpg` },
  { kind: "mea", label: "Jeu Disney", url: `${BLOB}/d5ea4f9b-adad-4fe0-b06a-c5c634d3396d-fAnOd5WzIgeVM8Q6avcFO2JlaTdzYj.jpg` },
  { kind: "mea", label: "Siège auto", url: `${BLOB}/3595bdd9-2c81-4e87-ace0-1d12ac369622-XYHVnTaf1IpOFKbvnKU8j28GrMMiao.jpg` },
  { kind: "mea", label: "Rentrée", url: `${BLOB}/23921561-4d4b-4b4c-8dbd-4bb508d02d45-9J4WyGKHUrP68a4m7K1XJmYY8Ec91C.jpg` },
  { kind: "mea", label: "Scolaire", url: `${BLOB}/2a7b114a-5cea-4a26-9d09-f816afee9d3d-PQ2RAndzuJtdNqgRSyZDdho5FHa1BD.jpg` },
  { kind: "mea", label: "Parkas", url: `${BLOB}/c3d2de10-3982-4a06-8633-81575b48331a-wTZUqDGoIkC6jea5bvAERoAmRifYYH.jpg` },
  { kind: "mea", label: "Best price", url: `${BLOB}/c8bd340e-3bee-4f53-bcc9-3b51919b279e-z82d4bHUCvvP3MoKMAN2QWEVdnqSS9.jpg` },
  { kind: "mea", label: "Siège auto Rider", url: `${BLOB}/a11596b0-2dde-4c77-bf35-7efcd73bc482-NrZIhyhygbqyXn9EnBw0Da9orpxhaB.jpg` },
];

export function isDemoImageUrl(url: unknown): boolean {
  return DEMO_GALLERY.some((image) => image.url === url);
}
