import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth, requireRole } from "@/lib/authz";
import { categoryCreateSchema } from "@/lib/schemas/org";
import { createCategory, listCategories } from "@/lib/org";

export async function GET() {
  return withApiErrorHandling(async () => {
    await requireAuth();

    const categories = await listCategories();
    return Response.json({ categories });
  });
}

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();
    requireRole(session, "ADMIN");

    const input = categoryCreateSchema.parse(await request.json());
    const category = await createCategory(session.employeeId, input);

    return Response.json({ category }, { status: 201 });
  });
}