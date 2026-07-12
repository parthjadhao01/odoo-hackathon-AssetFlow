import { z } from "zod";

// Every AssetStatus value — used to validate the `status=` filter param on
// GET /api/assets. Not the same set as `assetStatusSchema` below, which is
// the narrower manual-transition target set this screen is allowed to write
// (assets spec §5.1).
export const assetStatusFilterSchema = z.enum([
  "AVAILABLE",
  "ALLOCATED",
  "RESERVED",
  "UNDER_MAINTENANCE",
  "LOST",
  "RETIRED",
  "DISPOSED",
]);

const documentRefSchema = z.object({
  name: z.string().trim().min(1).max(100),
  url: z.string().url(),
});

// `assetTag` and `status` have no key here — never client-supplied (assets
// spec §3.1, same strip-by-absence pattern as `role` on signup/employee
// update). `extraValues`'s shape depends on the chosen category's
// `extraFields` definitions, so it's only checked here as a loose record;
// the real validation runs in the data layer against the DB row (§3.2).
export const assetCreateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  categoryId: z.string(),
  serialNumber: z.string().trim().min(1).max(100).optional(),
  acquisitionDate: z.coerce.date().max(new Date()).optional(),
  acquisitionCost: z.coerce.number().nonnegative().optional(),
  condition: z.string().trim().max(200).optional(),
  location: z.string().trim().max(150).optional(),
  photoUrl: z.string().url().optional(),
  documentUrls: z.array(documentRefSchema).max(10).optional(),
  bookable: z.boolean().default(false),
  extraValues: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export const assetUpdateSchema = assetCreateSchema.partial();

// Manual subset of the AssetStatus state machine this screen owns (assets
// spec §5) — ALLOCATED/RESERVED/UNDER_MAINTENANCE are reached only through
// the allocation/booking/maintenance flows, never through this route.
export const assetStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "RETIRED", "LOST", "DISPOSED"]),
});
