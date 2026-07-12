import type { Metadata } from "next";

import { getSession } from "@/lib/session";
import { getDashboardData } from "@/lib/dashboard";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard — AssetFlow",
};

export default async function DashboardPage() {
  // Session presence is already guaranteed by (protected)/layout.tsx.
  const session = (await getSession())!;
  const data = await getDashboardData(session);

  return <DashboardView fallbackData={data} />;
}