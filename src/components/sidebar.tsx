"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Image,
  Languages,
  LayoutTemplate,
  LogOut,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Code2,
  CalendarRange,
  Database,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevMode, setDevMode } from "@/lib/dev-mode";
import { useLocalMode, setLocalMode } from "@/lib/local-mode";
import { Switch } from "@/components/ui/switch";
import { LocalModeExitDialog } from "@/components/local-mode-exit-dialog";
import { listLocalImages, type LocalImageRecord } from "@/lib/local-images";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/media", label: "Médiathèque", icon: Image },
  { href: "/translations", label: "Traduction", icon: Languages },
  { href: "/cms-assets", label: "Assets CMS", icon: Database },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/programmation", label: "Programmation", icon: CalendarRange },
  { href: "/settings", label: "Paramétrage", icon: Settings },
];

const STORAGE_KEY = "sidebar-collapsed";

const collapsedListeners = new Set<() => void>();
function subscribeCollapsed(cb: () => void) {
  collapsedListeners.add(cb);
  return () => collapsedListeners.delete(cb);
}
function getCollapsedSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    () => false,
  );
  const devMode = useDevMode();
  const localMode = useLocalMode();
  const [exitRecords, setExitRecords] = useState<LocalImageRecord[] | null>(null);

  // Sortie du mode local : popin seulement s'il reste des images sur le poste.
  const changeLocalMode = async (next: boolean) => {
    if (next) return setLocalMode(true);
    const records = await listLocalImages().catch(() => []);
    if (records.length === 0) setLocalMode(false);
    else setExitRecords(records);
  };

  const toggle = () => {
    localStorage.setItem(STORAGE_KEY, String(!collapsed));
    collapsedListeners.forEach((cb) => cb());
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out",
        collapsed ? "w-15" : "w-60"
      )}
    >
      <div className={cn("flex h-14 items-center px-3", collapsed ? "justify-center" : "gap-2.5")}>
        {collapsed ? (
          <button
            onClick={toggle}
            title="Agrandir"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Layers className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="flex-1 truncate text-[15px] font-semibold tracking-tight text-sidebar-foreground">
              Brief Builder
            </span>
            <button
              onClick={toggle}
              title="Réduire"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pt-2 pb-2">
          <span className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Navigation
          </span>
        </div>
      )}

      <nav className={cn("flex-1 space-y-0.5", collapsed ? "px-2 pt-2" : "px-3")}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg text-[13px] font-medium transition-all",
                collapsed
                  ? "justify-center px-0 py-2"
                  : "gap-2.5 px-2.5 py-2",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-sidebar-primary" : ""
                )}
              />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-3")}>
        {/* Mode local : au-dessus du mode dev. Les images restent dans ce
            navigateur (cf. src/lib/local-mode.ts). */}
        {collapsed ? (
          <button
            onClick={() => changeLocalMode(!localMode)}
            title={`Mode local${localMode ? " (actif)" : ""}`}
            className={cn(
              "mb-1 flex w-full items-center justify-center rounded-lg py-2 text-[13px] font-medium transition-colors hover:bg-sidebar-accent/50",
              localMode ? "text-amber-600" : "text-muted-foreground/60 hover:text-sidebar-foreground",
            )}
          >
            <HardDrive className="h-4 w-4 shrink-0" />
          </button>
        ) : (
          <div className="mb-1 flex items-center justify-between gap-2 rounded-lg px-2.5">
            <span
              className={cn(
                "flex items-center gap-2.5 text-[13px] font-medium",
                localMode ? "text-amber-600" : "text-sidebar-foreground/60",
              )}
              title="Les images restent dans ce navigateur : rien n'est envoyé au serveur"
            >
              <HardDrive className="h-4 w-4 shrink-0" />
              Mode local
            </span>
            <Switch checked={localMode} onCheckedChange={changeLocalMode} className="scale-75" />
          </div>
        )}
        {collapsed ? (
          <button
            onClick={() => setDevMode(!devMode)}
            title={`Mode dev${devMode ? " (actif)" : ""}`}
            className={cn(
              "flex w-full items-center justify-center rounded-lg py-2 text-[13px] font-medium transition-colors hover:bg-sidebar-accent/50",
              devMode ? "text-primary" : "text-muted-foreground/60 hover:text-sidebar-foreground",
            )}
          >
            <Code2 className="h-4 w-4 shrink-0" />
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-lg px-2.5">
            <span className="flex items-center gap-2.5 text-[13px] font-medium text-sidebar-foreground/60">
              <Code2 className="h-4 w-4 shrink-0" />
              Mode dev
            </span>
            <Switch checked={devMode} onCheckedChange={setDevMode} className="scale-75" />
          </div>
        )}
      </div>

      <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-3")}>
        <button
          onClick={handleLogout}
          title={collapsed ? "Déconnexion" : undefined}
          className={cn(
            "flex w-full items-center rounded-lg text-[13px] font-medium text-muted-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Déconnexion"}
        </button>
      </div>
      <LocalModeExitDialog records={exitRecords} onRecordsChange={setExitRecords} />
    </aside>
  );
}
