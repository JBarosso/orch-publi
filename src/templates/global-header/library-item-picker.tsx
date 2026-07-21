"use client";

import { useEffect, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Search } from "lucide-react";
import type { GlobalHeaderLibraryItem, Locale } from "@/types";

interface LibraryItemPickerProps {
  locale: Locale;
  onPick: (item: GlobalHeaderLibraryItem) => void;
}

// Recherche + sélection d'un item de bibliothèque (par label), filtrée sur
// la locale du brief : charge son contenu dans le slot appelant. Se
// réinitialise après chaque sélection (action ponctuelle, pas une valeur
// persistante affichée).
export function LibraryItemPicker({ locale, onPick }: LibraryItemPickerProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GlobalHeaderLibraryItem[]>([]);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ locale });
      if (query) params.set("search", query);
      const res = await fetch(`/api/global-header-items?${params}`);
      if (res.ok) setItems(await res.json());
    }, 250);
    return () => clearTimeout(timer);
  }, [query, locale]);

  return (
    <Combobox.Root
      key={resetKey}
      items={items}
      itemToStringLabel={(item: GlobalHeaderLibraryItem) => item.label}
      onInputValueChange={setQuery}
      onValueChange={(item) => {
        if (item) {
          onPick(item as GlobalHeaderLibraryItem);
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
              {(item: GlobalHeaderLibraryItem) => (
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
