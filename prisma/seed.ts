import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const ADMIN_EMAIL = "admin@assetflow.local";
const ADMIN_PASSWORD = "ChangeMe123!";
const ADMIN_NAME = "AssetFlow Admin";

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.employee.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Seeded Admin employee for local testing:");
  console.log(`  email:    ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
