import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth, requireRole } from "@/lib/authz";
import { assetStatusSchema } from "@/lib/schemas/assets";
import { updateAssetStatus } from "@/lib/assets";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();
    requireRole(session, "ASSET_MANAGER", "ADMIN");

    const { id } = await params;
    const { status } = assetStatusSchema.parse(await request.json());
    const asset = await updateAssetStatus(session.employeeId, id, status);

    return Response.json({ asset });
  });
}
