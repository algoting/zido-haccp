-- Allow equipment to have an unbounded (infinite) min and/or max temperature,
-- chosen per-equipment by the user (e.g. a hot-holding unit may only need a
-- minimum, a freezer may only need a maximum).
ALTER TABLE "Equipment" ALTER COLUMN "minTempC" DROP NOT NULL;
ALTER TABLE "Equipment" ALTER COLUMN "maxTempC" DROP NOT NULL;
