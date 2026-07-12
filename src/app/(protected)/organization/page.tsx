import type { Metadata } from "next";

import { getSession } from "@/lib/session";
import { listCategories, listDepartments, listEmployees } from "@/lib/org";
import { OrgView } from "@/components/organization/org-view";

export const metadata: Metadata = {
  title: "Organization Setup — AssetFlow",
};

export default async function OrganizationPage() {
  // Session presence is already guaranteed by (protected)/layout.tsx.
  const session = (await getSession())!;

  if (session.role !== "ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">
          You don&apos;t have access to this page.
        </p>
      </div>
    );
  }

  const [departments, categories, employees] = await Promise.all([
    listDepartments(),
    listCategories(),
    listEmployees({}),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Organization Setup</h1>
      </div>
      <OrgView
        fallbackDepartments={departments}
        fallbackCategories={categories}
        fallbackEmployees={employees}
      />
    </div>
  );
}