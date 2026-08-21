-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('CONNECT', 'PRO_SUIVI', 'SERENITE');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "plan" "SubscriptionPlan" NOT NULL DEFAULT 'CONNECT';
