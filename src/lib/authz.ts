import type { Role } from "@/generated/prisma/client";
import { getSession, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/db";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not authorized to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Resolves the session or throws 401. Always the first middleware layer.
 *
 * The JWT only proves *who* the caller is; role/departmentId/status are
 * re-resolved from the DB on every call so a demotion, department move, or
 * deactivation takes effect on the very next request instead of waiting out
 * the cookie's TTL (org spec §2.1).
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { role: true, departmentId: true, status: true },
  });
  if (!employee || employee.status === "INACTIVE") {
    throw new UnauthorizedError();
  }

  return {
    employeeId: session.employeeId,
    role: employee.role,
    departmentId: employee.departmentId,
  };
}

/** Coarse role gate: is this role allowed to call the route at all. */
export function requireRole(session: SessionPayload, ...allowed: Role[]) {
  if (!allowed.includes(session.role)) {
    throw new ForbiddenError(
      `Role ${session.role} is not permitted to call this route`,
    );
  }
}

/**
 * Department Head is confined to their own department; Asset Manager/Admin
 * are org-wide and bypass this check.
 */
export function requireDepartmentScope(
  session: SessionPayload,
  resourceDeptId: string | null,
) {
  if (
    session.role === "DEPARTMENT_HEAD" &&
    resourceDeptId !== session.departmentId
  ) {
    throw new ForbiddenError("Not authorized for this department's resource");
  }
}

/**
 * Employee is confined to resources they own; approving roles bypass this
 * check (they're gated by requireRole instead).
 */
export function requireOwnResource(
  session: SessionPayload,
  resourceOwnerId: string,
) {
  if (session.role === "EMPLOYEE" && resourceOwnerId !== session.employeeId) {
    throw new ForbiddenError("Not authorized for this resource");
  }
}
