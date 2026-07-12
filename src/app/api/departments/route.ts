import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth, requireRole } from "@/lib/authz";
import { departmentCreateSchema, activeStatusSchema } from "@/lib/schemas/org";
import { createDepartment, listDepartments } from "@/lib/org";

export async function GET(request: Request) {
  return withApiErrorHandling(async () => {
    await requireAuth();

    const statusParam = new URL(request.url).searchParams.get("status");
    const status = statusParam ? activeStatusSchema.parse(statusParam) : undefined;

    const departments = await listDepartments(status);
    return Response.json({ departments });
  });
}

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();
    requireRole(session, "ADMIN");

    const input = departmentCreateSchema.parse(await request.json());
    const department = await createDepartment(session.employeeId, input);

    return Response.json({ department }, { status: 201 });
  });
}