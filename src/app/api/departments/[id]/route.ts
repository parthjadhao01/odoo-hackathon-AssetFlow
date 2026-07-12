import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth, requireRole } from "@/lib/authz";
import { departmentUpdateSchema } from "@/lib/schemas/org";
import { updateDepartment } from "@/lib/org";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();
    requireRole(session, "ADMIN");

    const { id } = await params;
    const input = departmentUpdateSchema.parse(await request.json());
    const department = await updateDepartment(session.employeeId, id, input);

    return Response.json({ department });
  });
}