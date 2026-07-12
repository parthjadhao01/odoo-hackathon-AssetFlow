import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { DepartmentListItem, CategoryListItem, EmployeeListItem } from "@/lib/org";

// Reference data, not a live feed — no polling (unlike the dashboard).
// The department list URL below is the same key Screens 4/5 will later
// consume, so an edit here revalidates their picklists for free.
const SWR_OPTS = { revalidateOnFocus: true };

export function useDepartments(status?: "ACTIVE" | "INACTIVE", fallbackData?: DepartmentListItem[]) {
  const url = status ? `/api/departments?status=${status}` : "/api/departments";
  return useSWR<{ departments: DepartmentListItem[] }>(url, fetcher, {
    ...SWR_OPTS,
    fallbackData: fallbackData ? { departments: fallbackData } : undefined,
  });
}

export function useCategories(fallbackData?: CategoryListItem[]) {
  return useSWR<{ categories: CategoryListItem[] }>("/api/categories", fetcher, {
    ...SWR_OPTS,
    fallbackData: fallbackData ? { categories: fallbackData } : undefined,
  });
}

export function useEmployees(fallbackData?: EmployeeListItem[]) {
  return useSWR<{ employees: EmployeeListItem[] }>("/api/employees", fetcher, {
    ...SWR_OPTS,
    fallbackData: fallbackData ? { employees: fallbackData } : undefined,
  });
}
