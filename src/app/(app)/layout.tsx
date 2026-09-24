import { Sidebar } from "@/components/sidebar";
import { LocalModeBanner } from "@/components/local-mode-banner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <LocalModeBanner />
        {children}
      </main>
    </>
  );
}
