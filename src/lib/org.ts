import { Prisma, type ActiveStatus, type Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/apiError";

type TxClient = Prisma.TransactionClient;

function buildDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Prisma.InputJsonValue {
  const diff: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (after[key] !== undefined && after[key] !== before[key]) {
      diff[key] = [before[key] ?? null, after[key]];
    }
  }
  return diff as Prisma.InputJsonValue;
}

/** Converts a raced-out DB unique-constraint hit into the readable 409 the pre-checks already guard against. */
function asConflict(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = (err.meta?.target as string[] | undefined) ?? [];
    if (target.includes("headId")) {
      throw new ConflictError("ALREADY_HEAD", "This employee already heads another department.");
    }
    if (target.includes("name")) {
      throw new ConflictError("DUPLICATE_NAME", "A record with this name already exists.");
    }
  }
  throw err;
}

// -----------------------------------------------------------------------------
// Departments
// -----------------------------------------------------------------------------

const departmentSelect = {
  id: true,
  name: true,
  status: true,
  parentDeptId: true,
  head: { select: { id: true, name: true } },
  parentDept: { select: { id: true, name: true } },
} satisfies Prisma.DepartmentSelect;

export type DepartmentListItem = Prisma.DepartmentGetPayload<{ select: typeof departmentSelect }>;

export async function listDepartments(status?: ActiveStatus): Promise<DepartmentListItem[]> {
  return prisma.department.findMany({
    where: status ? { status } : undefined,
    select: departmentSelect,
    orderBy: { name: "asc" },
  });
}

async function assertUniqueDepartmentName(tx: TxClient, name: string, excludeId?: string) {
  const existing = await tx.department.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true, name: true },
  });
  if (existing) {
    throw new ConflictError("DUPLICATE_NAME", `A department named "${existing.name}" already exists.`, {
      id: existing.id,
      name: existing.name,
    });
  }
}

async function assertParentUsable(tx: TxClient, parentDeptId: string) {
  const parent = await tx.department.findUnique({
    where: { id: parentDeptId },
    select: { id: true, name: true, status: true },
  });
  if (!parent || parent.status !== "ACTIVE") {
    throw new ConflictError(
      "PARENT_INACTIVE",
      "The selected parent department is inactive or does not exist.",
      parent ? { id: parent.id, name: parent.name } : { parentDeptId },
    );
  }
}

/** Walks the proposed parent's ancestor chain; rejects if `departmentId` (the dept being edited) appears in it. */
async function assertNoHierarchyCycle(tx: TxClient, departmentId: string, proposedParentId: string) {
  const chain: string[] = [];
  let currentId: string | null = proposedParentId;
  while (currentId) {
    if (currentId === departmentId) {
      throw new ConflictError("HIERARCHY_CYCLE", "This parent assignment would create a hierarchy cycle.", {
        chain: [...chain, currentId],
      });
    }
    chain.push(currentId);
    const current: { parentDeptId: string | null } | null = await tx.department.findUnique({
      where: { id: currentId },
      select: { parentDeptId: true },
    });
    currentId = current?.parentDeptId ?? null;
  }
}

async function assertHeadUsable(tx: TxClient, headId: string, excludeDeptId?: string) {
  const head = await tx.employee.findUnique({
    where: { id: headId },
    select: { id: true, status: true },
  });
  if (!head || head.status !== "ACTIVE") {
    throw new ConflictError("HEAD_UNAVAILABLE", "The selected employee is inactive or does not exist.", {
      employeeId: headId,
    });
  }

  const alreadyHeadOf = await tx.department.findFirst({
    where: { headId, ...(excludeDeptId ? { NOT: { id: excludeDeptId } } : {}) },
    select: { id: true, name: true },
  });
  if (alreadyHeadOf) {
    throw new ConflictError("ALREADY_HEAD", `This employee already heads "${alreadyHeadOf.name}".`, {
      departmentId: alreadyHeadOf.id,
      departmentName: alreadyHeadOf.name,
    });
  }
}

async function assertNoActiveChildren(tx: TxClient, departmentId: string) {
  const activeChildren = await tx.department.findMany({
    where: { parentDeptId: departmentId, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  if (activeChildren.length > 0) {
    throw new ConflictError(
      "HAS_ACTIVE_CHILDREN",
      "Deactivate or re-parent this department's active child departments first.",
      { children: activeChildren },
    );
  }
}

export async function createDepartment(
  actorId: string,
  input: { name: string; headId?: string | null; parentDeptId?: string | null },
): Promise<DepartmentListItem> {
  try {
    return await prisma.$transaction(async (tx) => {
      await assertUniqueDepartmentName(tx, input.name);
      if (input.parentDeptId) {
        await assertParentUsable(tx, input.parentDeptId);
      }
      if (input.headId) {
        await assertHeadUsable(tx, input.headId);
      }

      const created = await tx.department.create({
        data: {
          name: input.name,
          headId: input.headId ?? null,
          parentDeptId: input.parentDeptId ?? null,
        },
        select: departmentSelect,
      });

      await tx.activityLog.create({
        data: {
          actorId,
          targetId: created.id,
          targetType: "Department",
          action: "DEPARTMENT_CREATED",
          metadata: { name: created.name },
        },
      });

      return created;
    });
  } catch (err) {
    asConflict(err);
  }
}

export async function updateDepartment(
  actorId: string,
  id: string,
  input: { name?: string; headId?: string | null; parentDeptId?: string | null; status?: ActiveStatus },
): Promise<DepartmentListItem> {
  try {
    return await prisma.$transaction(async (tx) => {
      const before = await tx.department.findUnique({
        where: { id },
        select: { id: true, name: true, headId: true, parentDeptId: true, status: true },
      });
      if (!before) throw new NotFoundError("Department not found");

      if (input.name !== undefined) {
        await assertUniqueDepartmentName(tx, input.name, id);
      }
      if (input.parentDeptId !== undefined && input.parentDeptId !== null) {
        await assertParentUsable(tx, input.parentDeptId);
        await assertNoHierarchyCycle(tx, id, input.parentDeptId);
      }
      if (input.headId !== undefined && input.headId !== null) {
        await assertHeadUsable(tx, input.headId, id);
      }
      if (input.status === "INACTIVE" && before.status === "ACTIVE") {
        await assertNoActiveChildren(tx, id);
      }

      const updated = await tx.department.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.headId !== undefined ? { headId: input.headId } : {}),
          ...(input.parentDeptId !== undefined ? { parentDeptId: input.parentDeptId } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
        select: departmentSelect,
      });

      const diff = buildDiff(before, {
        name: input.name,
        headId: input.headId,
        parentDeptId: input.parentDeptId,
        status: input.status,
      });
      if (Object.keys(diff).length > 0) {
        await tx.activityLog.create({
          data: {
            actorId,
            targetId: id,
            targetType: "Department",
            action: "DEPARTMENT_UPDATED",
            metadata: diff,
          },
        });
      }

      return updated;
    });
  } catch (err) {
    asConflict(err);
  }
}

// -----------------------------------------------------------------------------
// Asset Categories
// -----------------------------------------------------------------------------

export type CategoryFieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "date";
  required: boolean;
};

const categorySelect = {
  id: true,
  name: true,
  extraFields: true,
} satisfies Prisma.AssetCategorySelect;

export type CategoryListItem = Prisma.AssetCategoryGetPayload<{ select: typeof categorySelect }>;

export async function listCategories(): Promise<CategoryListItem[]> {
  return prisma.assetCategory.findMany({
    select: categorySelect,
    orderBy: { name: "asc" },
  });
}

async function assertUniqueCategoryName(tx: TxClient, name: string, excludeId?: string) {
  const existing = await tx.assetCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true, name: true },
  });
  if (existing) {
    throw new ConflictError("DUPLICATE_NAME", `A category named "${existing.name}" already exists.`, {
      id: existing.id,
      name: existing.name,
    });
  }
}

export async function createCategory(
  actorId: string,
  input: { name: string; extraFields?: CategoryFieldDef[] },
): Promise<CategoryListItem> {
  try {
    return await prisma.$transaction(async (tx) => {
      await assertUniqueCategoryName(tx, input.name);

      const created = await tx.assetCategory.create({
        data: {
          name: input.name,
          extraFields: input.extraFields ?? Prisma.JsonNull,
        },
        select: categorySelect,
      });

      await tx.activityLog.create({
        data: {
          actorId,
          targetId: created.id,
          targetType: "AssetCategory",
          action: "CATEGORY_CREATED",
          metadata: { name: created.name },
        },
      });

      return created;
    });
  } catch (err) {
    asConflict(err);
  }
}

export async function updateCategory(
  actorId: string,
  id: string,
  input: { name?: string; extraFields?: CategoryFieldDef[] },
): Promise<CategoryListItem> {
  try {
    return await prisma.$transaction(async (tx) => {
      const before = await tx.assetCategory.findUnique({
        where: { id },
        select: { id: true, name: true, extraFields: true },
      });
      if (!before) throw new NotFoundError("Category not found");

      if (input.name !== undefined) {
        await assertUniqueCategoryName(tx, input.name, id);
      }

      const updated = await tx.assetCategory.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.extraFields !== undefined ? { extraFields: input.extraFields } : {}),
        },
        select: categorySelect,
      });

      const diff = buildDiff(before, { name: input.name, extraFields: input.extraFields });
      if (Object.keys(diff).length > 0) {
        await tx.activityLog.create({
          data: {
            actorId,
            targetId: id,
            targetType: "AssetCategory",
            action: "CATEGORY_UPDATED",
            metadata: diff,
          },
        });
      }

      return updated;
    });
  } catch (err) {
    asConflict(err);
  }
}

// -----------------------------------------------------------------------------
// Employee Directory
// -----------------------------------------------------------------------------

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  department: { select: { id: true, name: true } },
  headOfDepartment: { select: { id: true, name: true } },
} satisfies Prisma.EmployeeSelect;

export type EmployeeListItem = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;

export async function listEmployees(filters: {
  q?: string;
  departmentId?: string;
  role?: Role;
  status?: ActiveStatus;
}): Promise<EmployeeListItem[]> {
  return prisma.employee.findMany({
    where: {
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: "insensitive" } },
              { email: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: employeeSelect,
    orderBy: { name: "asc" },
  });
}

export type UpdateEmployeeResult = {
  employee: EmployeeListItem;
  warnings?: {
    activeAllocations: { allocationId: string; assetTag: string; assetName: string }[];
  };
};

export async function updateEmployee(
  actorId: string,
  targetId: string,
  input: { departmentId?: string | null; status?: ActiveStatus },
): Promise<UpdateEmployeeResult> {
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.employee.findUnique({
      where: { id: targetId },
      select: { id: true, departmentId: true, status: true },
    });
    if (!before) throw new NotFoundError("Employee not found");

    if (input.status === "INACTIVE" && before.status === "ACTIVE") {
      if (targetId === actorId) {
        throw new ConflictError("SELF_DEACTIVATION", "You cannot deactivate your own account.");
      }
      const headOf = await tx.department.findFirst({
        where: { headId: targetId, status: "ACTIVE" },
        select: { id: true, name: true },
      });
      if (headOf) {
        throw new ConflictError(
          "IS_DEPARTMENT_HEAD",
          `This employee heads the active department "${headOf.name}". Reassign the head first.`,
          { departmentId: headOf.id, departmentName: headOf.name },
        );
      }
    }

    if (input.departmentId !== undefined && input.departmentId !== null) {
      const dept = await tx.department.findUnique({
        where: { id: input.departmentId },
        select: { id: true, name: true, status: true },
      });
      if (!dept || dept.status !== "ACTIVE") {
        throw new ConflictError(
          "DEPARTMENT_INACTIVE",
          "The selected department is inactive or does not exist.",
          dept ? { id: dept.id, name: dept.name } : { departmentId: input.departmentId },
        );
      }
    }

    const updated = await tx.employee.update({
      where: { id: targetId },
      data: {
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      select: employeeSelect,
    });

    const diff = buildDiff(before, { departmentId: input.departmentId, status: input.status });
    if (Object.keys(diff).length > 0) {
      await tx.activityLog.create({
        data: {
          actorId,
          targetId,
          targetType: "Employee",
          action: "EMPLOYEE_UPDATED",
          metadata: diff,
        },
      });
    }

    let warnings: UpdateEmployeeResult["warnings"];
    if (updated.status === "INACTIVE") {
      const activeAllocations = await tx.allocation.findMany({
        where: { employeeId: targetId, status: "ACTIVE" },
        select: { id: true, asset: { select: { assetTag: true, name: true } } },
      });
      if (activeAllocations.length > 0) {
        warnings = {
          activeAllocations: activeAllocations.map((a) => ({
            allocationId: a.id,
            assetTag: a.asset.assetTag,
            assetName: a.asset.name,
          })),
        };
      }
    }

    return { employee: updated, warnings };
  });

  return result;
}