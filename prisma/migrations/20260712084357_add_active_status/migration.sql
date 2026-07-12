-- CreateEnum
CREATE TYPE "ActiveStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE';
