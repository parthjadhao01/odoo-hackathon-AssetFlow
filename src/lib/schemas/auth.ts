import { z } from "zod";

// No `role` key in this shape at all — a client-supplied `role` in the raw
// body is dropped by `.parse()` regardless, before it can reach the handler.
export const signupSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// ADMIN is deliberately excluded — it is pre-provisioned/system-granted only
// and is never a valid target for this route (spec §2.2).
export const roleChangeSchema = z.object({
  role: z.enum(["EMPLOYEE", "DEPARTMENT_HEAD", "ASSET_MANAGER"]),
});
