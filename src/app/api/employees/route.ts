import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth, requireRole } from "@/lib/authz";
import { activeStatusSchema, roleFilterSchema } from "@/lib/schemas/org";
import { listEmployees } from "@/lib/org";

export async function GET(request: Request) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();
    requireRole(session, "ADMIN");

    const params = new URL(request.url).searchParams;
    const q = params.get("q") ?? undefined;
    const departmentId = params.get("departmentId") ?? undefined;
    const roleParam = params.get("role");
    const statusParam = params.get("status");

    const employees = await listEmployees({
      q,
      departmentId,
      role: roleParam ? roleFilterSchema.parse(roleParam) : undefined,
      status: statusParam ? activeStatusSchema.parse(statusParam) : undefined,
    });

    return Response.json({ employees });
  });
}