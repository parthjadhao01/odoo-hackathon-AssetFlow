import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth, requireRole } from "@/lib/authz";
import { categoryUpdateSchema } from "@/lib/schemas/org";
import { updateCategory } from "@/lib/org";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();
    requireRole(session, "ADMIN");

    const { id } = await params;
    const input = categoryUpdateSchema.parse(await request.json());
    const category = await updateCategory(session.employeeId, id, input);

    return Response.json({ category });
  });
}