"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_BASE } from "./config";

// Même apparence que src/components/sidebar.tsx, réduite aux deux onglets de la démo.
const NAV_ITEMS = [
  { href: DEMO_BASE, label: "Dashboard", icon: LayoutDashboard },
  { href: `${DEMO_BASE}/settings`, label: "Paramétrage", icon: Settings },
];

export function DemoSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 px-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Layers className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="flex-1 truncate text-[15px] font-semibold tracking-tight text-sidebar-foreground">
          Brief Builder
        </span>
      </div>

      <div className="px-3 pt-2 pb-2">
        <span className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Navigation
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          // Le dashboard reste actif dans l'éditeur et l'export d'un brief.
          const isActive =
            item.href === DEMO_BASE
              ? !pathname.startsWith(`${DEMO_BASE}/settings`)
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
