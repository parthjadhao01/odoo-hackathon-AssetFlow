"use client";

import { useDashboard } from "@/hooks/use-dashboard";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { OverdueBanner } from "@/components/dashboard/overdue-banner";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import type { DashboardResponse } from "@/lib/dashboard";

export function DashboardView({
  fallbackData,
}: {
  fallbackData?: DashboardResponse;
}) {
  const { data, isLoading } = useDashboard(fallbackData);
  const loading = isLoading && !data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Today&apos;s Overview</h1>
      </div>
      <KpiGrid kpis={data?.kpis} loading={loading} />
      <OverdueBanner count={data?.overdueCount ?? 0} />
      <QuickActions quickActions={data?.quickActions} />
      <RecentActivity items={data?.recentActivity} loading={loading} />
    </div>
  );
}