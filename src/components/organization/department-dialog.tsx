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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiRequest } from "@/lib/fetcher";
import { departmentCreateSchema } from "@/lib/schemas/org";
import type { DepartmentListItem, EmployeeListItem } from "@/lib/org";

const NONE = "__none__";

/** Self + every descendant of `rootId`, per the department hierarchy — org spec §3.2's cycle guard, applied client-side for UX. */
function descendantIds(departments: DepartmentListItem[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const d of departments) {
      if (d.parentDeptId && ids.has(d.parentDeptId) && !ids.has(d.id)) {
        ids.add(d.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function DepartmentDialog({
  open,
  onOpenChange,
  department,
  departments,
  employees,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = create mode */
  department?: DepartmentListItem;
  departments: DepartmentListItem[];
  employees: EmployeeListItem[];
  onSuccess: () => void;
}) {
  const isEdit = !!department;
  const [name, setName] = useState(department?.name ?? "");
  const [headId, setHeadId] = useState<string>(department?.head?.id ?? NONE);
  const [parentDeptId, setParentDeptId] = useState<string>(department?.parentDeptId ?? NONE);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(department?.status ?? "ACTIVE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const excluded = department ? descendantIds(departments, department.id) : new Set<string>();
  const parentOptions = departments.filter((d) => d.status === "ACTIVE" && !excluded.has(d.id));
  const headOptions = employees.filter((e) => e.status === "ACTIVE");

  const selectedHead = employees.find((e) => e.id === headId);
  const headIncoherent =
    selectedHead &&
    (selectedHead.role !== "DEPARTMENT_HEAD" ||
      (department && selectedHead.department?.id !== department.id));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const parsed = departmentCreateSchema.safeParse({
      name,
      headId: headId === NONE ? null : headId,
      parentDeptId: parentDeptId === NONE ? null : parentDeptId,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      if (isEdit) {
        await apiRequest(`/api/departments/${department.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...parsed.data, status }),
        });
        toast.success("Department updated");
      } else {
        await apiRequest("/api/departments", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast.success("Department created");
      }
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
          <DialogTitle>{isEdit ? "Edit department" : "New department"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="dept-name">Name</FieldLabel>
              <Input
                id="dept-name"
                value={name}
                aria-invalid={!!errors.name}
                onChange={(e) => setName(e.target.value)}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Department Head</FieldLabel>
              <Select value={headId} onValueChange={(v) => setHeadId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {headOptions.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {headIncoherent && (
                <p className="text-sm text-muted-foreground">
                  {selectedHead.name} is not currently a Department Head of this
                  department — this only sets the org-chart label, it does not
                  change their role or department.
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel>Parent Department</FieldLabel>
              <Select value={parentDeptId} onValueChange={(v) => setParentDeptId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {parentOptions.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {isEdit && (
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
            )}
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2Icon className="animate-spin" />}
              {isEdit ? "Save changes" : "Create department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}