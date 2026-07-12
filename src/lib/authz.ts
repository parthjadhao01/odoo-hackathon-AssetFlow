import type { Role } from "@/generated/prisma/client";
import { getSession, type SessionPayload } from "@/lib/session";

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

/** Resolves the session or throws 401. Always the first middleware layer. */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
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
