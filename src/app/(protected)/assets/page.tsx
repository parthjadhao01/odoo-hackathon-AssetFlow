import type { Metadata } from "next";

import { getSession } from "@/lib/session";
import { listAssets } from "@/lib/assets";
import { listCategories, listDepartments } from "@/lib/org";
import { AssetView } from "@/components/assets/asset-view";

export const metadata: Metadata = {
  title: "Assets — AssetFlow",
};

export default async function AssetsPage() {
  // Session presence is already guaranteed by (protected)/layout.tsx.
  const session = (await getSession())!;

  const [assets, categories, departments] = await Promise.all([
    listAssets({}, session),
    listCategories(),
    listDepartments("ACTIVE"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Assets</h1>
      </div>
      <AssetView
        fallbackAssets={assets}
        categories={categories}
        departments={departments}
        role={session.role}
      />
    </div>
  );
}
