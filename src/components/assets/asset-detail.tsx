"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiRequest } from "@/lib/fetcher";
import { useAssetDetail } from "@/hooks/use-assets";
import { STATUS_LABEL } from "@/components/assets/asset-table";
import type { AssetDetailItem } from "@/lib/assets";
import type { Role } from "@/generated/prisma/client";
import type { AssetStatus } from "@/generated/prisma/client";

// Manual subset of the AssetStatus state machine this screen owns (assets
// spec §5.1) — a client-side convenience mirror of `MANUAL_STATUS_TRANSITIONS`
// in `src/lib/assets.ts`; the server allow-list is the actual enforcement.
const MANUAL_STATUS_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  AVAILABLE: ["RETIRED", "LOST"],
  ALLOCATED: [],
  RESERVED: [],
  UNDER_MAINTENANCE: ["RETIRED"],
  LOST: ["AVAILABLE", "DISPOSED"],
  RETIRED: ["DISPOSED"],
  DISPOSED: [],
};

function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function AssetDetail({
  assetId,
  open,
  onOpenChange,
  role,
  onEdit,
  onChanged,
}: {
  assetId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  onEdit: (asset: AssetDetailItem) => void;
  onChanged: () => void;
}) {
  const { data, isLoading, mutate } = useAssetDetail(open ? assetId : undefined);
  const [changingStatus, setChangingStatus] = useState(false);

  const canManage = role === "ASSET_MANAGER" || role === "ADMIN";

  async function handleStatusChange(next: string) {
    if (!data) return;
    setChangingStatus(true);
    try {
      await apiRequest(`/api/assets/${data.asset.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      toast.success("Status updated");
      mutate();
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setChangingStatus(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {!data ? (
          <SheetHeader>
            <SheetTitle>{isLoading ? "Loading…" : "Asset"}</SheetTitle>
          </SheetHeader>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{data.asset.name}</SheetTitle>
              <SheetDescription>
                {data.asset.assetTag} — {data.asset.category.name}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 pb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div>{STATUS_LABEL[data.asset.status] ?? data.asset.status}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Location</span>
                  <div>{data.asset.location ?? "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Serial number</span>
                  <div>{data.asset.serialNumber ?? "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Condition</span>
                  <div>{data.asset.condition ?? "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Acquired</span>
                  <div>{fmtDate(data.asset.acquisitionDate)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Bookable</span>
                  <div>{data.asset.bookable ? "Yes" : "No"}</div>
                </div>
              </div>

              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(data.asset)}>
                    Edit
                  </Button>
                  {MANUAL_STATUS_TRANSITIONS[data.asset.status].length > 0 && (
                    <Select
                      onValueChange={(v: string | null) => {
                        if (v) handleStatusChange(v);
                      }}
                      disabled={changingStatus}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Change status…" />
                      </SelectTrigger>
                      <SelectContent>
                        {MANUAL_STATUS_TRANSITIONS[data.asset.status].map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABEL[s] ?? s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div>
                <h3 className="mb-2 text-sm font-medium">Allocation history</h3>
                {data.allocationHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No allocations yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2 text-sm">
                    {data.allocationHistory.map((a) => (
                      <li key={a.id} className="rounded-lg border p-2">
                        <div className="flex items-center justify-between">
                          <span>{a.holder?.name ?? "Unknown holder"}</span>
                          <Badge variant={a.status === "ACTIVE" ? "default" : "outline"}>
                            {a.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(a.allocatedAt)}
                          {a.returnedAt
                            ? ` – ${fmtDate(a.returnedAt)}`
                            : a.expectedReturnDate
                              ? ` (due ${fmtDate(a.expectedReturnDate)})`
                              : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Maintenance history</h3>
                {data.maintenanceHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No maintenance requests yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2 text-sm">
                    {data.maintenanceHistory.map((m) => (
                      <li key={m.id} className="rounded-lg border p-2">
                        <div className="flex items-center justify-between">
                          <span>{m.description}</span>
                          <Badge variant="outline">{m.status}</Badge>
                        </div>
                        {m.resolvedAt && (
                          <div className="text-xs text-muted-foreground">
                            Resolved {fmtDate(m.resolvedAt)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
