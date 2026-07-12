"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DepartmentListItem } from "@/lib/org";

export function DepartmentTable({
  departments,
  onEdit,
}: {
  departments: DepartmentListItem[];
  onEdit: (department: DepartmentListItem) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Department</TableHead>
          <TableHead>Head</TableHead>
          <TableHead>Parent Dept</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {departments.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No departments yet.
            </TableCell>
          </TableRow>
        )}
        {departments.map((dept) => (
          <TableRow key={dept.id}>
            <TableCell className="font-medium">{dept.name}</TableCell>
            <TableCell>{dept.head?.name ?? "—"}</TableCell>
            <TableCell>{dept.parentDept?.name ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={dept.status === "ACTIVE" ? "default" : "outline"}>
                {dept.status === "ACTIVE" ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" onClick={() => onEdit(dept)}>
                Edit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}