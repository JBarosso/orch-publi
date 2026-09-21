import { BriefLockProvider } from "./brief-lock-context";

// Commune au brief et à son export : c'est elle qui porte le verrou
// d'édition, pour qu'il survive au passage vers l'export (cf. brief-lock-context).
export default function BriefLayout({ children }: { children: React.ReactNode }) {
  return <BriefLockProvider>{children}</BriefLockProvider>;
}
