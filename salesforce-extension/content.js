// Injecté dans la page Business Manager ET dans l'iframe cross-origin du
// storefront (all_frames: true côté manifest) — c'est CETTE iframe qui
// contient réellement la popin "Targeting" du Page Designer.
//
// Stratégie de ciblage : par TEXTE (labels, intitulés de bouton) plutôt que
// par classes CSS. Les classes Lightning/SLDS sont utilitaires et instables
// dans le temps ; les libellés visibles ("Display From", "Targeting"...)
// sont la partie la plus stable de l'UI Salesforce d'une mise à jour à l'autre.

const STORAGE_KEY = "programmations";
const ENABLED_KEY = "captureEnabled";

function textOf(el) {
  return (el?.textContent || "").trim();
}

// Résout la valeur d'un input à partir du texte de son <label>, en gérant
// le cas label[for=id] et le cas où label + input partagent juste un
// conteneur parent proche (pattern le plus courant dans ce genre d'UI).
function getFieldValueByLabel(root, labelText) {
  const labels = [...root.querySelectorAll("label")];
  const label = labels.find((l) => textOf(l) === labelText);
  if (!label) return null;

  if (label.htmlFor) {
    const input = root.querySelector(`#${CSS.escape(label.htmlFor)}`);
    if (input) return input.value || null;
  }

  let container = label.parentElement;
  for (let i = 0; i < 3 && container; i++) {
    const input = container.querySelector("input");
    if (input) return input.value || null;
    container = container.parentElement;
  }
  return null;
}

// Les locales sélectionnées sont rendues comme des "pills" retirables dans
// un groupe identifié par aria-label="Selected Options:" (distinct de la
// liste complète des choix disponibles, qui reste dans le DOM même fermée).
function getSelectedLocales(dialog) {
  const group = dialog.querySelector('[aria-label="Selected Options:"]');
  if (!group) return [];
  return [...group.querySelectorAll('[role="option"]')]
    .map((opt) => {
      const clone = opt.cloneNode(true);
      clone.querySelectorAll("button, [aria-hidden='true']").forEach((n) => n.remove());
      return textOf(clone);
    })
    .filter(Boolean);
}

function findTargetingDialog(applyButton) {
  let el = applyButton.closest('[role="dialog"]');
  if (el && hasTargetingHeading(el)) return el;

  // Repli si le rôle ARIA n'est pas exactement "dialog" : remonte quelques
  // niveaux et vérifie la présence du titre "Targeting" + du label
  // "Display From" pour confirmer qu'on est au bon endroit.
  el = applyButton.parentElement;
  for (let i = 0; i < 8 && el; i++) {
    if (hasTargetingHeading(el) && hasLabel(el, "Display From")) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function hasTargetingHeading(el) {
  return [...el.querySelectorAll('h1,h2,h3,[role="heading"]')].some((h) => textOf(h) === "Targeting");
}

function hasLabel(el, labelText) {
  return [...el.querySelectorAll("label")].some((l) => textOf(l) === labelText);
}

function captureFromDialog(dialog) {
  chrome.storage.local.get([ENABLED_KEY], (data) => {
    if (data[ENABLED_KEY] === false) return; // activé par défaut

    const locales = getSelectedLocales(dialog);
    const displayFrom = getFieldValueByLabel(dialog, "Display From");
    const displayTo = getFieldValueByLabel(dialog, "Display To");

    // Rien de significatif à sauvegarder (ex: Apply cliqué sans rien remplir)
    if (locales.length === 0 && !displayFrom && !displayTo) return;

    const assetId = getFieldValueByLabel(document, "Content Asset ID");
    const label = assetId || document.title || "Programmation Salesforce";

    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      label,
      locales,
      displayFrom: displayFrom || null,
      displayTo: displayTo || null,
      capturedAt: new Date().toISOString(),
    };

    chrome.storage.local.get([STORAGE_KEY], (res) => {
      const list = res[STORAGE_KEY] || [];
      list.push(entry);
      chrome.storage.local.set({ [STORAGE_KEY]: list });
    });
  });
}

// Capture phase : s'exécute avant que le gestionnaire propre de l'appli
// (React) ne traite le clic et ne ferme/démonte potentiellement la popin.
document.addEventListener(
  "click",
  (event) => {
    const btn = event.target.closest("button");
    if (!btn || textOf(btn) !== "Apply") return;

    const dialog = findTargetingDialog(btn);
    if (!dialog) return; // autre bouton "Apply" de l'appli (ex: panneau latéral)

    captureFromDialog(dialog);
  },
  true,
);
