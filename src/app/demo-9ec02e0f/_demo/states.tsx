import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_BASE } from "./config";

export function DemoLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export function DemoNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      Brief introuvable.
      <Link href={DEMO_BASE}>
        <Button variant="outline" size="sm">
          Retour au dashboard
        </Button>
      </Link>
    </div>
  );
}
