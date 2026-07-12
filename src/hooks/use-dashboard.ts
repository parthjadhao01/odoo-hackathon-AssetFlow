import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { DashboardResponse } from "@/lib/dashboard";

const POLL_INTERVAL_MS = 8000;

export function useDashboard(fallbackData?: DashboardResponse) {
  return useSWR<DashboardResponse>("/api/dashboard", fetcher, {
    refreshInterval: POLL_INTERVAL_MS,
    fallbackData,
  });
}
