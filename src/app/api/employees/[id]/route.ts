import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth, requireRole } from "@/lib/authz";
import { employeeUpdateSchema } from "@/lib/schemas/org";
import { updateEmployee } from "@/lib/org";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();
    requireRole(session, "ADMIN");

    const { id } = await params;
    const input = employeeUpdateSchema.parse(await request.json());
    const result = await updateEmployee(session.employeeId, id, input);

    return Response.json(result);
  });
}