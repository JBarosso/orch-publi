import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BriefsList } from "@/components/briefs/briefs-list";

export default function DashboardPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez vos briefs hebdomadaires par langue
          </p>
        </div>
        <Link href="/briefs/new">
          <Button className="shadow-sm shadow-primary/20">
            <Plus className="mr-1.5 h-4 w-4" />
            Nouveau brief
          </Button>
        </Link>
      </div>

      <BriefsList />
    </div>
  );
}
