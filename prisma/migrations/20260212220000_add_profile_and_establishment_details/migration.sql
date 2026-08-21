-- AlterTable
ALTER TABLE "User" ADD COLUMN "profilePictureUrl" TEXT,
ADD COLUMN "displayName" TEXT;

-- AlterTable
ALTER TABLE "Establishment" ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "description" TEXT;
