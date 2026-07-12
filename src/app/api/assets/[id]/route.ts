import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth, requireRole } from "@/lib/authz";
import { assetUpdateSchema } from "@/lib/schemas/assets";
import { getAssetDetail, updateAsset } from "@/lib/assets";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();

    const { id } = await params;
    const detail = await getAssetDetail(id, session);

    return Response.json(detail);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();
    requireRole(session, "ASSET_MANAGER", "ADMIN");

    const { id } = await params;
    const input = assetUpdateSchema.parse(await request.json());
    const asset = await updateAsset(session.employeeId, id, input);

    return Response.json({ asset });
  });
}
