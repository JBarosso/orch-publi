"use client";

import { useEffect, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Search } from "lucide-react";
import type { Locale } from "@/types";

interface LibraryPickerProps<T> {
  /** Route de la bibliothèque, filtrée par `locale` et `search` (label). */
  endpoint: string;
  locale: Locale;
  onPick: (item: T) => void;
}

// Recherche + sélection d'un élément de bibliothèque (par label), filtrée sur
// la locale du brief : l'appelant copie son contenu dans l'emplacement visé.
// Se réinitialise après chaque sélection (action ponctuelle, pas une valeur
// persistante affichée). Partagé par le Global header et l'Edito.
export function LibraryPicker<T extends { id: string; label: string }>({
  endpoint,
  locale,
  onPick,
}: LibraryPickerProps<T>) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ locale });
      if (query) params.set("search", query);
      const res = await fetch(`${endpoint}?${params}`);
      if (res.ok) setItems(await res.json());
    }, 250);
    return () => clearTimeout(timer);
  }, [endpoint, query, locale]);

  return (
    <Combobox.Root
      key={resetKey}
      items={items}
      itemToStringLabel={(item: T) => item.label}
      onInputValueChange={setQuery}
      onValueChange={(item) => {
        if (item) {
          onPick(item as T);
          setQuery("");
          setResetKey((k) => k + 1);
        }
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Combobox.Input
          placeholder="Charger depuis la bibliothèque..."
          className="h-7 w-full rounded-md border border-input bg-white pl-6 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
      <Combobox.Portal>
        <Combobox.Positioner className="isolate z-50" sideOffset={4}>
          <Combobox.Popup className="max-h-60 w-(--anchor-width) min-w-48 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <Combobox.Empty className="px-2 py-1.5 text-xs text-muted-foreground">
              Aucun résultat
            </Combobox.Empty>
            <Combobox.List>
              {(item: T) => (
                <Combobox.Item
                  key={item.id}
                  value={item}
                  className="cursor-default rounded-md px-2 py-1.5 text-xs outline-hidden data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {item.label}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
