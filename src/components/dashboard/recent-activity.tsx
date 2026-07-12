import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardResponse } from "@/lib/dashboard";

export function RecentActivity({
  items,
  loading,
}: {
  items: DashboardResponse["recentActivity"] | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {loading ? (
          <>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </>
        ) : !items || items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          items.map((item, index) => (
            <p key={index} className="text-sm text-foreground">
              {item.text}
              <span className="ml-2 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.occurredAt), {
                  addSuffix: true,
                })}
              </span>
            </p>
          ))
        )}
      </CardContent>
    </Card>
  );
}