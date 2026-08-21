-- Remove sopalogs API key field (using RabbitMQ with global credentials instead)
-- Remove lastSopalogSync field (using real-time RabbitMQ instead of polling)
ALTER TABLE "Equipment" DROP COLUMN "sopalogApiKey";
ALTER TABLE "Equipment" DROP COLUMN "lastSopalogSync";
