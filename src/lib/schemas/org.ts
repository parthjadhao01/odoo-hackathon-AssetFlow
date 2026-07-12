import { z } from "zod";

export const activeStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

// --- Departments -----------------------------------------------------------

export const departmentCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  headId: z.string().nullable().optional(),
  parentDeptId: z.string().nullable().optional(),
});

// `.partial()` makes every create-shape key optional; `status` is edit-only
// (creates always start ACTIVE, org spec §3.1) so it's added on top rather
// than being part of the create shape.
export const departmentUpdateSchema = departmentCreateSchema.partial().extend({
  status: activeStatusSchema.optional(),
});

// --- Categories --------------------------------------------------------------

// Field-definition shape rendered by Screen 4's asset form for this
// category (org spec §4.2) — not a value, just the definition.
export const categoryFieldDefSchema = z.object({
  key: z
    .string()
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Key must start with a letter and contain only letters, numbers, or underscores")
    .max(40),
  label: z.string().trim().min(1).max(60),
  type: z.enum(["text", "number", "date"]),
  required: z.boolean().default(false),
});

const extraFieldsSchema = z
  .array(categoryFieldDefSchema)
  .max(20)
  .refine(
    (fields) => new Set(fields.map((f) => f.key)).size === fields.length,
    { message: "Duplicate field keys are not allowed" },
  );

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  extraFields: extraFieldsSchema.optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

// All four roles are valid here — this only filters the directory list, it
// never assigns a role (that's roleChangeSchema in schemas/auth.ts, which
// deliberately excludes ADMIN).
export const roleFilterSchema = z.enum(["EMPLOYEE", "DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN"]);

// --- Employees ---------------------------------------------------------------

// No `role` key in this shape — a client-supplied `role` in the raw body is
// dropped by `.parse()` regardless. Role changes only ever go through
// PATCH /api/employees/:id/role (org spec §5.1, RBAC spec §2.3).
export const employeeUpdateSchema = z.object({
  departmentId: z.string().nullable().optional(),
  status: activeStatusSchema.optional(),
});