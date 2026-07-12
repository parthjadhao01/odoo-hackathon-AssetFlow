"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssets } from "@/hooks/use-assets";
import { AssetTable, STATUS_LABEL } from "@/components/assets/asset-table";
import { AssetDialog } from "@/components/assets/asset-dialog";
import { AssetDetail } from "@/components/assets/asset-detail";
import type { AssetListItem, AssetDetailItem } from "@/lib/assets";
import type { CategoryListItem, DepartmentListItem } from "@/lib/org";
import type { Role } from "@/generated/prisma/client";

const ALL = "__all__";

export function AssetView({
  fallbackAssets,
  categories,
  departments,
  role,
}: {
  fallbackAssets: AssetListItem[];
  categories: CategoryListItem[];
  departments: DepartmentListItem[];
  role: Role;
}) {
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [departmentId, setDepartmentId] = useState(ALL);

  const assetsQuery = useAssets(
    {
      q: q || undefined,
      categoryId: categoryId === ALL ? undefined : categoryId,
      status: status === ALL ? undefined : status,
      departmentId: departmentId === ALL ? undefined : departmentId,
    },
    fallbackAssets,
  );
  const assets = assetsQuery.data?.assets ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetDetailItem | undefined>();

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();

  function refresh() {
    assetsQuery.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder="Search by tag, serial, or QR code…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        {/* Server-enforced by requireRole("ASSET_MANAGER", "ADMIN") on POST /api/assets — this is UX only (assets spec §8). */}
        {(role === "ASSET_MANAGER" || role === "ADMIN") && (
          <Button
            onClick={() => {
              setEditingAsset(undefined);
              setDialogOpen(true);
            }}
          >
            <PlusIcon /> Register Asset
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={categoryId} onValueChange={(v) => setCategoryId(v as string)}>
          <SelectTrigger>
            {/* Base UI's Select.Value shows the raw value by default — map it to a label. */}
            <SelectValue>
              {(value: unknown) =>
                value === ALL ? "All categories" : (categories.find((c) => c.id === value)?.name ?? String(value))
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v as string)}>
          <SelectTrigger>
            <SelectValue>
              {(value: unknown) =>
                value === ALL ? "All statuses" : (STATUS_LABEL[value as string] ?? String(value))
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={departmentId} onValueChange={(v) => setDepartmentId(v as string)}>
          <SelectTrigger>
            <SelectValue>
              {(value: unknown) =>
                value === ALL ? "All departments" : (departments.find((d) => d.id === value)?.name ?? String(value))
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {assetsQuery.isLoading && !assetsQuery.data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <AssetTable
          assets={assets}
          onSelect={(asset) => {
            setSelectedAssetId(asset.id);
            setDetailOpen(true);
          }}
        />
      )}

      <AssetDialog
        key={`${editingAsset?.id ?? "new"}:${dialogOpen}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        asset={editingAsset}
        categories={categories}
        onSuccess={refresh}
      />

      <AssetDetail
        assetId={selectedAssetId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        role={role}
        onEdit={(asset) => {
          setDetailOpen(false);
          setEditingAsset(asset);
          setDialogOpen(true);
        }}
        onChanged={refresh}
      />
    </div>
  );
}
