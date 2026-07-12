"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EmployeeListItem } from "@/lib/org";

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "Employee",
  DEPARTMENT_HEAD: "Department Head",
  ASSET_MANAGER: "Asset Manager",
  ADMIN: "Admin",
};

const ALL = "__all__";

export function EmployeeTable({
  employees,
  onEdit,
}: {
  employees: EmployeeListItem[];
  onEdit: (employee: EmployeeListItem) => void;
}) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);

  const filtered = employees.filter((emp) => {
    if (role !== ALL && emp.role !== role) return false;
    if (status !== ALL && emp.status !== status) return false;
    if (q && !emp.name.toLowerCase().includes(q.toLowerCase()) && !emp.email.toLowerCase().includes(q.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={role} onValueChange={(v) => setRole(v as string)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            <SelectItem value="EMPLOYEE">Employee</SelectItem>
            <SelectItem value="DEPARTMENT_HEAD">Department Head</SelectItem>
            <SelectItem value="ASSET_MANAGER">Asset Manager</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as string)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No employees match these filters.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((emp) => (
            <TableRow key={emp.id}>
              <TableCell className="font-medium">{emp.name}</TableCell>
              <TableCell className="text-muted-foreground">{emp.email}</TableCell>
              <TableCell>{emp.department?.name ?? "—"}</TableCell>
              <TableCell>{ROLE_LABEL[emp.role] ?? emp.role}</TableCell>
              <TableCell>
                <Badge variant={emp.status === "ACTIVE" ? "default" : "outline"}>
                  {emp.status === "ACTIVE" ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => onEdit(emp)}>
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}