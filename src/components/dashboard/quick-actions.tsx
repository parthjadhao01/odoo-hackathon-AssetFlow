import Link from "next/link";
import { Plus, CalendarPlus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardResponse } from "@/lib/dashboard";

export function QuickActions({
  quickActions,
}: {
  quickActions: DashboardResponse["quickActions"] | undefined;
}) {
  if (!quickActions) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {quickActions.registerAsset && (
        <Button nativeButton={false} render={<Link href="/assets/new" />}>
          <Plus />
          register asset
        </Button>
      )}
      {quickActions.bookResource && (
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/bookings/new" />}
        >
          <CalendarPlus />
          Book resource
        </Button>
      )}
      {quickActions.raiseRequest && (
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/maintenance-requests/new" />}
        >
          <Wrench />
          Raise requests
        </Button>
      )}
    </div>
  );
}
