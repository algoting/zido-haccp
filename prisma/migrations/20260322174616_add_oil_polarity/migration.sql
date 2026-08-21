-- AlterTable
ALTER TABLE "OilCheck" ADD COLUMN "polarity" INTEGER;

-- AlterTable: make oilChanged default to false
ALTER TABLE "OilCheck" ALTER COLUMN "oilChanged" SET DEFAULT false;
