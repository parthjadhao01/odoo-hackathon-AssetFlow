import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { AssetDetailResponse, AssetListItem } from "@/lib/assets";

export type AssetFilters = {
  q?: string;
  categoryId?: string;
  status?: string;
  departmentId?: string;
  bookable?: boolean;
};

function buildAssetsUrl(filters: AssetFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.status) params.set("status", filters.status);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.bookable !== undefined) params.set("bookable", String(filters.bookable));
  const qs = params.toString();
  return qs ? `/api/assets?${qs}` : "/api/assets";
}

// Reference-ish data (like org's picklists) but filters change the SWR key
// itself, so each distinct filter combination gets its own cache entry —
// the department filter in particular needs a real server round-trip
// (assets spec §4's derived-join scoping can't be replicated client-side).
export function useAssets(filters: AssetFilters, fallbackData?: AssetListItem[]) {
  const url = buildAssetsUrl(filters);
  const isUnfiltered = url === "/api/assets";
  return useSWR<{ assets: AssetListItem[] }>(url, fetcher, {
    revalidateOnFocus: true,
    fallbackData: fallbackData && isUnfiltered ? { assets: fallbackData } : undefined,
  });
}

export function useAssetDetail(id: string | undefined) {
  return useSWR<AssetDetailResponse>(id ? `/api/assets/${id}` : null, fetcher);
}
