import type { ProgrammationCountry } from "@/types";

// ID figé via le champ "key" du manifest de salesforce-extension/ — reste
// identique quel que soit qui charge l'extension en "unpacked" (voir le
// README de l'extension pour le détail).
export const SALESFORCE_EXTENSION_ID = "mmflbabaopfdnobammoejjfodcfgjlle";

export interface CapturedProgrammation {
  id: string;
  label: string;
  locales: string[];
  displayFrom: string | null;
  displayTo: string | null;
  capturedAt: string;
}

// Locales Salesforce (nom affiché dans le sélecteur) -> pays de l'onglet
// Programmation. Les locales génériques sans pays ("French", "default"...)
// n'ont pas de correspondance univoque et sont ignorées à l'import.
const LOCALE_TO_COUNTRY: Record<string, ProgrammationCountry> = {
  "French (France)": "FR",
  "French (Belgium)": "BE",
  "Dutch (Belgium)": "BE",
  "Spanish (Spain)": "ES",
  "Greek (Greece)": "GR",
};

export function mapLocalesToCountries(locales: string[]): ProgrammationCountry[] {
  const countries = new Set<ProgrammationCountry>();
  for (const locale of locales) {
    const country = LOCALE_TO_COUNTRY[locale];
    if (country) countries.add(country);
  }
  return [...countries];
}

// Les champs Display From/To de Salesforce sont au format "DD/MM/YYYY
// HH:mm am|pm" — on ne garde que la date. Parsing manuel plutôt que
// new Date(...) : le constructeur interprète les slashs en MM/DD/YYYY
// (convention US), ce qui inverserait jour et mois.
export function parseSalesforceDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

interface ChromeRuntimeLike {
  lastError?: { message?: string };
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void,
  ) => void;
}

function getChromeRuntime(): ChromeRuntimeLike | null {
  const runtime = (window as unknown as { chrome?: { runtime?: ChromeRuntimeLike } }).chrome?.runtime;
  return runtime?.sendMessage ? runtime : null;
}

export function isExtensionApiAvailable(): boolean {
  return getChromeRuntime() !== null;
}

function sendToExtension<T>(message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const runtime = getChromeRuntime();
    if (!runtime) {
      reject(new Error("Extension Chrome introuvable ou non installée"));
      return;
    }
    runtime.sendMessage(SALESFORCE_EXTENSION_ID, message, (response) => {
      if (runtime.lastError) {
        reject(new Error(runtime.lastError.message ?? "Extension injoignable"));
        return;
      }
      resolve(response as T);
    });
  });
}

export function getCapturedProgrammations(): Promise<CapturedProgrammation[]> {
  return sendToExtension<{ programmations: CapturedProgrammation[] }>({
    type: "GET_PROGRAMMATIONS",
  }).then((res) => res.programmations ?? []);
}

export function clearCapturedProgrammations(): Promise<void> {
  return sendToExtension<{ success: boolean }>({ type: "CLEAR_ALL" }).then(() => undefined);
}
