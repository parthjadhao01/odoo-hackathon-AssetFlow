-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "acquisitionDate" TIMESTAMP(3),
ADD COLUMN     "bookable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "documentUrls" JSONB,
ADD COLUMN     "extraValues" JSONB,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "serialNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Asset_serialNumber_key" ON "Asset"("serialNumber");

