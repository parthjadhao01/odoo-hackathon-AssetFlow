import { z } from "zod";
import { Prisma, type AssetStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/apiError";
import { ForbiddenError } from "@/lib/authz";
import type { SessionPayload } from "@/lib/session";
import type { CategoryFieldDef } from "@/lib/org";
import type { assetCreateSchema, assetUpdateSchema } from "@/lib/schemas/assets";

type TxClient = Prisma.TransactionClient;
type CreateAssetInput = z.infer<typeof assetCreateSchema>;
type UpdateAssetInput = z.infer<typeof assetUpdateSchema>;

const MAX_TAG_ATTEMPTS = 5;

// Manual subset of the AssetStatus state machine this screen owns (assets
// spec §5) — ALLOCATED/RESERVED/UNDER_MAINTENANCE are reached only through
// the allocation/booking/maintenance flows, never listed as a target here.
const MANUAL_STATUS_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  AVAILABLE: ["RETIRED", "LOST"],
  ALLOCATED: [],
  RESERVED: [],
  UNDER_MAINTENANCE: ["RETIRED"],
  LOST: ["AVAILABLE", "DISPOSED"],
  RETIRED: ["DISPOSED"],
  DISPOSED: [],
};

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

/** Converts a raced-out serial-number unique-constraint hit into the readable 409 the pre-check already guards against. */
function mapAssetConflict(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = (err.meta?.target as string[] | undefined) ?? [];
    if (target.includes("serialNumber")) {
      throw new ConflictError("DUPLICATE_SERIAL", "This serial number is already in use.");
    }
  }
  throw err;
}

function isAssetTagConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    ((err.meta?.target as string[] | undefined) ?? []).includes("assetTag")
  );
}

/**
 * Role-scoped visibility (assets spec §4 / RBAC spec §4's "scoped same as
 * dashboard"): EMPLOYEE sees only assets they currently hold, DEPARTMENT_HEAD
 * sees their department's currently-allocated assets (direct + via
 * employee), ASSET_MANAGER/ADMIN see everything. Mirrors
 * `dashboard.ts`'s `allocationDeptScope`, applied through the `allocations`
 * relation instead of querying `Allocation` directly.
 */
function assetScope(session: SessionPayload): Prisma.AssetWhereInput | undefined {
  if (session.role === "ADMIN" || session.role === "ASSET_MANAGER") {
    return undefined;
  }
  if (session.role === "DEPARTMENT_HEAD") {
    return {
      allocations: {
        some: {
          status: "ACTIVE",
          OR: [
            { departmentId: session.departmentId },
            { employee: { departmentId: session.departmentId } },
          ],
        },
      },
    };
  }
  return { allocations: { some: { status: "ACTIVE", employeeId: session.employeeId } } };
}

/**
 * Validates `extraValues` against the category's `extraFields` definitions
 * (assets spec §3.2) by building a Zod object schema on the fly — reuses the
 * existing ZodError → 400 mapping in apiError.ts instead of inventing a new
 * error type for a shape violation.
 */
function validateExtraValues(
  fieldDefs: unknown,
  extraValues: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | undefined {
  const defs = Array.isArray(fieldDefs) ? (fieldDefs as CategoryFieldDef[]) : [];
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const def of defs) {
    const base =
      def.type === "number"
        ? z.number()
        : def.type === "date"
          ? z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
          : z.string();
    shape[def.key] = def.required ? base : base.optional();
  }

  const parsed = z.object(shape).strict().parse(extraValues ?? {});
  return Object.keys(parsed).length > 0 ? (parsed as Prisma.InputJsonValue) : undefined;
}

async function assertUniqueSerial(tx: TxClient, serialNumber: string, excludeId?: string) {
  const existing = await tx.asset.findFirst({
    where: { serialNumber, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true, assetTag: true },
  });
  if (existing) {
    throw new ConflictError(
      "DUPLICATE_SERIAL",
      `Serial number "${serialNumber}" is already used by ${existing.assetTag}.`,
      { id: existing.id, assetTag: existing.assetTag },
    );
  }
}

// -----------------------------------------------------------------------------
// Selects
// -----------------------------------------------------------------------------

const assetListSelect = {
  id: true,
  assetTag: true,
  name: true,
  status: true,
  location: true,
  category: { select: { id: true, name: true } },
} satisfies Prisma.AssetSelect;

export type AssetListItem = Prisma.AssetGetPayload<{ select: typeof assetListSelect }>;

const assetDetailSelect = {
  ...assetListSelect,
  categoryId: true,
  serialNumber: true,
  acquisitionDate: true,
  acquisitionCost: true,
  condition: true,
  photoUrl: true,
  documentUrls: true,
  bookable: true,
  extraValues: true,
} satisfies Prisma.AssetSelect;

export type AssetDetailItem = Prisma.AssetGetPayload<{ select: typeof assetDetailSelect }>;

// -----------------------------------------------------------------------------
// List / filter — GET /api/assets
// -----------------------------------------------------------------------------

export async function listAssets(
  filters: {
    q?: string;
    categoryId?: string;
    status?: AssetStatus;
    departmentId?: string;
    bookable?: boolean;
  },
  session: SessionPayload,
): Promise<AssetListItem[]> {
  // Client-supplied `departmentId` narrows the caller's own role scope, it
  // never widens it (assets spec §4.1 — never trust a client-supplied scope
  // param on its own).
  const departmentFilter: Prisma.AssetWhereInput | undefined = filters.departmentId
    ? {
        allocations: {
          some: {
            status: "ACTIVE",
            OR: [
              { departmentId: filters.departmentId },
              { employee: { departmentId: filters.departmentId } },
            ],
          },
        },
      }
    : undefined;

  return prisma.asset.findMany({
    where: {
      AND: [
        assetScope(session) ?? {},
        departmentFilter ?? {},
        filters.categoryId ? { categoryId: filters.categoryId } : {},
        filters.status ? { status: filters.status } : {},
        filters.bookable !== undefined ? { bookable: filters.bookable } : {},
        filters.q
          ? {
              OR: [
                { assetTag: { contains: filters.q, mode: "insensitive" } },
                { serialNumber: { contains: filters.q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    select: assetListSelect,
    orderBy: { assetTag: "asc" },
  });
}

// -----------------------------------------------------------------------------
// Create — POST /api/assets
// -----------------------------------------------------------------------------

/**
 * `assetTag` generation (assets spec §2.1): `count()+1` is a plain read, not
 * a reservation, so the outer retry re-runs the whole attempt as a fresh
 * transaction on a raced assetTag collision — a mid-transaction retry isn't
 * possible in Postgres once a statement inside it has errored. The `+
 * attempt` offset guarantees each retry proposes a different tag even if
 * `count()` reads the same value again.
 */
export async function createAsset(actorId: string, input: CreateAssetInput): Promise<AssetDetailItem> {
  for (let attempt = 0; attempt < MAX_TAG_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const category = await tx.assetCategory.findUnique({
          where: { id: input.categoryId },
          select: { extraFields: true },
        });
        if (!category) throw new NotFoundError("Category not found");

        if (input.serialNumber) {
          await assertUniqueSerial(tx, input.serialNumber);
        }

        const extraValues = validateExtraValues(category.extraFields, input.extraValues);

        const count = await tx.asset.count();
        const assetTag = `AF-${String(count + 1 + attempt).padStart(4, "0")}`;

        const created = await tx.asset.create({
          data: {
            assetTag,
            name: input.name,
            status: "AVAILABLE",
            categoryId: input.categoryId,
            serialNumber: input.serialNumber ?? null,
            acquisitionDate: input.acquisitionDate ?? null,
            acquisitionCost: input.acquisitionCost ?? null,
            condition: input.condition ?? null,
            location: input.location ?? null,
            photoUrl: input.photoUrl ?? null,
            documentUrls: input.documentUrls ?? Prisma.JsonNull,
            bookable: input.bookable ?? false,
            extraValues: extraValues ?? Prisma.JsonNull,
          },
          select: assetDetailSelect,
        });

        await tx.activityLog.create({
          data: {
            actorId,
            targetId: created.id,
            targetType: "Asset",
            action: "ASSET_REGISTERED",
            metadata: { assetTag: created.assetTag, categoryId: input.categoryId },
          },
        });

        return created;
      });
    } catch (err) {
      if (isAssetTagConflict(err) && attempt < MAX_TAG_ATTEMPTS - 1) continue;
      mapAssetConflict(err);
    }
  }
  throw new Error("Could not generate a unique asset tag after several attempts");
}

// -----------------------------------------------------------------------------
// Edit — PATCH /api/assets/:id (excludes status, assets spec §3.3)
// -----------------------------------------------------------------------------

export async function updateAsset(
  actorId: string,
  id: string,
  input: UpdateAssetInput,
): Promise<AssetDetailItem> {
  try {
    return await prisma.$transaction(async (tx) => {
      const before = await tx.asset.findUnique({
        where: { id },
        select: {
          name: true,
          categoryId: true,
          serialNumber: true,
          location: true,
          condition: true,
          bookable: true,
          extraValues: true,
        },
      });
      if (!before) throw new NotFoundError("Asset not found");

      if (input.serialNumber !== undefined && input.serialNumber !== before.serialNumber && input.serialNumber) {
        await assertUniqueSerial(tx, input.serialNumber, id);
      }

      // Changing category, or supplying new extraValues, re-validates against
      // the (possibly new) category's definitions — stale values from the old
      // category are rejected, not silently kept (assets spec §3.3).
      let extraValues: Prisma.InputJsonValue | undefined;
      if (input.categoryId !== undefined || input.extraValues !== undefined) {
        const categoryId = input.categoryId ?? before.categoryId;
        const category = await tx.assetCategory.findUnique({
          where: { id: categoryId },
          select: { extraFields: true },
        });
        if (!category) throw new NotFoundError("Category not found");

        const candidateValues =
          input.extraValues ?? ((before.extraValues as Record<string, unknown> | null) ?? undefined);
        extraValues = validateExtraValues(category.extraFields, candidateValues);
      }

      const updated = await tx.asset.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber ?? null } : {}),
          ...(input.acquisitionDate !== undefined ? { acquisitionDate: input.acquisitionDate } : {}),
          ...(input.acquisitionCost !== undefined ? { acquisitionCost: input.acquisitionCost } : {}),
          ...(input.condition !== undefined ? { condition: input.condition ?? null } : {}),
          ...(input.location !== undefined ? { location: input.location ?? null } : {}),
          ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl ?? null } : {}),
          ...(input.documentUrls !== undefined ? { documentUrls: input.documentUrls ?? Prisma.JsonNull } : {}),
          ...(input.bookable !== undefined ? { bookable: input.bookable } : {}),
          ...(extraValues !== undefined ? { extraValues } : {}),
        },
        select: assetDetailSelect,
      });

      const diff = buildDiff(before, {
        name: input.name,
        categoryId: input.categoryId,
        serialNumber: input.serialNumber,
        location: input.location,
        condition: input.condition,
        bookable: input.bookable,
      });
      if (Object.keys(diff).length > 0) {
        await tx.activityLog.create({
          data: {
            actorId,
            targetId: id,
            targetType: "Asset",
            action: "ASSET_UPDATED",
            metadata: diff,
          },
        });
      }

      return updated;
    });
  } catch (err) {
    mapAssetConflict(err);
  }
}

// -----------------------------------------------------------------------------
// Manual status transitions — PATCH /api/assets/:id/status (assets spec §5.1)
// -----------------------------------------------------------------------------

export async function updateAssetStatus(
  actorId: string,
  id: string,
  status: AssetStatus,
): Promise<AssetDetailItem> {
  return prisma.$transaction(async (tx) => {
    const before = await tx.asset.findUnique({ where: { id }, select: { status: true } });
    if (!before) throw new NotFoundError("Asset not found");

    const allowed = MANUAL_STATUS_TRANSITIONS[before.status];
    if (!allowed.includes(status)) {
      throw new ConflictError(
        "INVALID_STATUS_TRANSITION",
        `Cannot move an asset from ${before.status} to ${status}.`,
        { from: before.status, to: status },
      );
    }

    const updated = await tx.asset.update({
      where: { id },
      data: { status },
      select: assetDetailSelect,
    });

    await tx.activityLog.create({
      data: {
        actorId,
        targetId: id,
        targetType: "Asset",
        action: "ASSET_STATUS_CHANGED",
        metadata: { fromStatus: before.status, toStatus: status },
      },
    });

    return updated;
  });
}

// -----------------------------------------------------------------------------
// Detail + history — GET /api/assets/:id (assets spec §6)
// -----------------------------------------------------------------------------

export type AllocationHistoryItem = {
  id: string;
  status: string;
  holder: { type: "employee" | "department"; id: string; name: string } | null;
  allocatedAt: string;
  expectedReturnDate: string | null;
  returnedAt: string | null;
};

export type MaintenanceHistoryItem = {
  id: string;
  status: string;
  description: string;
  resolvedAt: string | null;
  createdAt: string;
};

export type AssetDetailResponse = {
  asset: AssetDetailItem;
  allocationHistory: AllocationHistoryItem[];
  maintenanceHistory: MaintenanceHistoryItem[];
};

export async function getAssetDetail(id: string, session: SessionPayload): Promise<AssetDetailResponse> {
  const scope = assetScope(session);
  // Out-of-scope and nonexistent collapse to the same outcome for a scoped
  // role (403, RBAC spec §5.4's fail-fast ordering — no existence oracle for
  // EMPLOYEE/DEPARTMENT_HEAD); org-wide roles get a real 404.
  const asset = await prisma.asset.findFirst({ where: { id, ...scope }, select: assetDetailSelect });
  if (!asset) {
    throw scope ? new ForbiddenError("Not authorized for this asset") : new NotFoundError("Asset not found");
  }

  const [allocations, maintenanceRequests] = await Promise.all([
    prisma.allocation.findMany({
      where: { assetId: id },
      select: {
        id: true,
        status: true,
        allocatedAt: true,
        expectedReturnDate: true,
        returnedAt: true,
        employee: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.maintenanceRequest.findMany({
      where: { assetId: id },
      select: { id: true, status: true, description: true, resolvedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    asset,
    allocationHistory: allocations.map((a) => ({
      id: a.id,
      status: a.status,
      holder: a.employee
        ? { type: "employee", id: a.employee.id, name: a.employee.name }
        : a.department
          ? { type: "department", id: a.department.id, name: a.department.name }
          : null,
      allocatedAt: a.allocatedAt.toISOString(),
      expectedReturnDate: a.expectedReturnDate?.toISOString() ?? null,
      returnedAt: a.returnedAt?.toISOString() ?? null,
    })),
    maintenanceHistory: maintenanceRequests.map((m) => ({
      id: m.id,
      status: m.status,
      description: m.description,
      resolvedAt: m.resolvedAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}
