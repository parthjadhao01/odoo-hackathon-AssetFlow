import { KpiCard } from "@/components/dashboard/kpi-card";
import type { DashboardResponse } from "@/lib/dashboard";

const CARD_LABELS: { key: keyof DashboardResponse["kpis"]; label: string }[] = [
  { key: "available", label: "Available" },
  { key: "allocated", label: "Allocated" },
  { key: "underMaintenance", label: "Under Maintenance" },
  { key: "activeBookings", label: "Active Bookings" },
  { key: "pendingTransfers", label: "Pending Transfers" },
  { key: "upcomingReturns", label: "Upcoming Returns" },
];

export function KpiGrid({
  kpis,
  loading,
}: {
  kpis: DashboardResponse["kpis"] | undefined;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CARD_LABELS.map(({ key, label }) => (
        <KpiCard
          key={key}
          label={label}
          value={kpis?.[key] ?? 0}
          loading={loading}
        />
      ))}
    </div>
  );
}
