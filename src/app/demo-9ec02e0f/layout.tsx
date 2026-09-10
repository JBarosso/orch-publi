import type { Metadata } from "next";
import { DemoSidebar } from "./_demo/sidebar";

// Démo publique : exemptée du login dans src/proxy.ts, jamais indexée.
export const metadata: Metadata = {
  title: "Brief Builder — Démo",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </>
  );
}
