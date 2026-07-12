"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AssetListItem } from "@/lib/assets";

export const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  AVAILABLE: "default",
  ALLOCATED: "secondary",
  RESERVED: "outline",
  UNDER_MAINTENANCE: "destructive",
  LOST: "destructive",
  RETIRED: "outline",
  DISPOSED: "outline",
};

export const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  ALLOCATED: "Allocated",
  RESERVED: "Reserved",
  UNDER_MAINTENANCE: "Under Maintenance",
  LOST: "Lost",
  RETIRED: "Retired",
  DISPOSED: "Disposed",
};

export function AssetTable({
  assets,
  onSelect,
}: {
  assets: AssetListItem[];
  onSelect: (asset: AssetListItem) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tag</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Location</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No assets match these filters.
            </TableCell>
          </TableRow>
        )}
        {assets.map((asset) => (
          <TableRow
            key={asset.id}
            className="cursor-pointer"
            onClick={() => onSelect(asset)}
          >
            <TableCell className="font-medium">{asset.assetTag}</TableCell>
            <TableCell>{asset.name}</TableCell>
            <TableCell>{asset.category.name}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[asset.status] ?? "outline"}>
                {STATUS_LABEL[asset.status] ?? asset.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{asset.location ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
