"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiRequest } from "@/lib/fetcher";
import type { DepartmentListItem, EmployeeListItem, UpdateEmployeeResult } from "@/lib/org";

const NONE = "__none__";

export function EmployeeDialog({
  open,
  onOpenChange,
  employee,
  departments,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeListItem;
  departments: DepartmentListItem[];
  onSuccess: () => void;
}) {
  const [departmentId, setDepartmentId] = useState<string>(employee.department?.id ?? NONE);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(employee.status);
  const [role, setRole] = useState(employee.role);
  const [submitting, setSubmitting] = useState(false);

  const departmentOptions = departments.filter(
    (d) => d.status === "ACTIVE" || d.id === employee.department?.id,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const patch: { departmentId?: string | null; status?: "ACTIVE" | "INACTIVE" } = {};
      const nextDepartmentId = departmentId === NONE ? null : departmentId;
      if (nextDepartmentId !== (employee.department?.id ?? null)) {
        patch.departmentId = nextDepartmentId;
      }
      if (status !== employee.status) {
        patch.status = status;
      }

      if (Object.keys(patch).length > 0) {
        const result = await apiRequest<UpdateEmployeeResult>(`/api/employees/${employee.id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        if (result.warnings?.activeAllocations?.length) {
          const assets = result.warnings.activeAllocations.map((a) => a.assetTag).join(", ");
          toast.warning(`${employee.name} still holds active allocations: ${assets}`);
        }
      }

      // Role changes go through the dedicated promotion route — the only
      // place roles are ever assigned (org spec §5, RBAC spec §2.3).
      if (role !== employee.role) {
        await apiRequest(`/api/employees/${employee.id}/role`, {
          method: "PATCH",
          body: JSON.stringify({ role }),
        });
      }

      toast.success("Employee updated");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{employee.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel>Department</FieldLabel>
              <Select value={departmentId} onValueChange={(v) => setDepartmentId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {departmentOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="DEPARTMENT_HEAD">Department Head</SelectItem>
                  <SelectItem value="ASSET_MANAGER">Asset Manager</SelectItem>
                  {employee.role === "ADMIN" && <SelectItem value="ADMIN">Admin</SelectItem>}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select value={status} onValueChange={(v) => setStatus(v as "ACTIVE" | "INACTIVE")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2Icon className="animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}