const STORAGE_KEY = "programmations";
const ENABLED_KEY = "captureEnabled";

const toggleEl = document.getElementById("toggle");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const cleanBtn = document.getElementById("clean-btn");
const countEl = document.getElementById("count");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function render(programmations) {
  listEl.innerHTML = "";
  countEl.textContent = String(programmations.length);
  emptyEl.style.display = programmations.length === 0 ? "block" : "none";
  cleanBtn.disabled = programmations.length === 0;

  for (const p of programmations) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        <strong>${escapeHtml(p.label || "Sans nom")}</strong>
        <button class="delete-btn" data-id="${escapeHtml(p.id)}" title="Supprimer">×</button>
      </div>
      <div class="card-locales">${escapeHtml((p.locales || []).join(", ") || "Aucune locale")}</div>
      <div class="card-dates">${escapeHtml(p.displayFrom || "—")} → ${escapeHtml(p.displayTo || "—")}</div>
    `;
    listEl.appendChild(card);
  }
}

function load() {
  chrome.storage.local.get([STORAGE_KEY, ENABLED_KEY], (data) => {
    toggleEl.checked = data[ENABLED_KEY] !== false; // activé par défaut
    render(data[STORAGE_KEY] || []);
  });
}

toggleEl.addEventListener("change", () => {
  chrome.storage.local.set({ [ENABLED_KEY]: toggleEl.checked });
});

cleanBtn.addEventListener("click", () => {
  if (!confirm("Supprimer toutes les programmations enregistrées ?")) return;
  chrome.storage.local.set({ [STORAGE_KEY]: [] });
});

listEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;
  const id = btn.dataset.id;
  chrome.storage.local.get([STORAGE_KEY], (data) => {
    const next = (data[STORAGE_KEY] || []).filter((p) => p.id !== id);
    chrome.storage.local.set({ [STORAGE_KEY]: next });
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[STORAGE_KEY] || changes[ENABLED_KEY]) load();
});

load();
