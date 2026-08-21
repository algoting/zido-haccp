-- Delete all suspended users and their related data from the database
-- This script handles the cascade deletion with proper ordering

DO $$ 
DECLARE 
  suspended_user_count INT;
BEGIN
  -- Count suspended users first
  SELECT COUNT(*) INTO suspended_user_count FROM "User" WHERE suspended = true;
  RAISE NOTICE 'Found % suspended users', suspended_user_count;

  -- Step 1: Get IDs of all suspended users
  CREATE TEMP TABLE suspended_user_ids AS
  SELECT id, email FROM "User" WHERE suspended = true;

  -- Step 2: Delete related data in proper cascade order

  -- Delete all AuditLogs where suspended user is the actor
  DELETE FROM "AuditLog" WHERE "actorUserId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted AuditLogs';

  -- Delete all CorrectiveActions created by suspended users
  DELETE FROM "CorrectiveAction" WHERE "createdByUserId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted CorrectiveActions';

  -- Delete all CleaningTaskChecks
  DELETE FROM "CleaningTaskCheck" WHERE "checkedByUserId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted CleaningTaskChecks';

  -- Delete all OilChecks
  DELETE FROM "OilCheck" WHERE "recordedByUserId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted OilChecks';

  -- Delete all SupportMessages
  DELETE FROM "SupportMessage" WHERE "senderUserId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted SupportMessages';

  -- Delete all SupportTickets (cascades to messages)
  DELETE FROM "SupportTicket" WHERE "createdByUserId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted SupportTickets';

  -- Delete all PreparationBatches
  DELETE FROM "PreparationBatch" WHERE "createdByUserId" IN (SELECT id FROM suspended_user_ids) 
    OR "destroyedByUserId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted PreparationBatches';

  -- Delete all InternalPreparations
  DELETE FROM "InternalPreparation" WHERE "createdByUserId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted InternalPreparations';

  -- Delete all Products
  DELETE FROM "Product" WHERE "createdBy" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted Products';

  -- Delete all GoodsReceptions
  DELETE FROM "GoodsReception" WHERE "createdBy" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted GoodsReceptions';

  -- Delete all TemperatureLogs that may reference equipment created by suspended users
  DELETE FROM "TemperatureLog" WHERE "recordedByUserId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted TemperatureLogs by suspended users';

  -- Delete TemperatureLogs for ALL equipment (will be deleted next)
  DELETE FROM "TemperatureLog" WHERE "equipmentId" IN (
    SELECT id FROM "Equipment" WHERE "createdByUserId" IN (SELECT id FROM suspended_user_ids)
  );
  RAISE NOTICE 'Deleted TemperatureLogs for equipment created by suspended users';

  -- Delete all Incidents (which reference TemperatureLogs via triggerTemperatureLogId and equipment)
  DELETE FROM "Incident" WHERE "triggerTemperatureLogId" IN (
    SELECT id FROM "TemperatureLog" WHERE "recordedByUserId" IN (SELECT id FROM suspended_user_ids)
  );
  RAISE NOTICE 'Deleted Incidents via temperature logs';

  -- Delete remaining Incidents for equipment created by suspended users
  DELETE FROM "Incident" WHERE "equipmentId" IN (
    SELECT id FROM "Equipment" WHERE "createdByUserId" IN (SELECT id FROM suspended_user_ids)
  );
  RAISE NOTICE 'Deleted Incidents for equipment';

  -- Delete all Equipment created by suspended users
  DELETE FROM "Equipment" WHERE "createdByUserId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted Equipment';

  -- Delete all NotificationEvents for suspended users
  DELETE FROM "NotificationEvent" WHERE "userId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted NotificationEvents for users';

  -- Delete all NotificationEvents for establishments owned by suspended users
  DELETE FROM "NotificationEvent" WHERE "establishmentId" IN (
    SELECT id FROM "Establishment" WHERE "ownerId" IN (SELECT id FROM suspended_user_ids)
  );
  RAISE NOTICE 'Deleted NotificationEvents for establishments';

  -- Delete EquipmentSectors for establishments owned by suspended users
  DELETE FROM "EquipmentSector" WHERE "establishmentId" IN (
    SELECT id FROM "Establishment" WHERE "ownerId" IN (SELECT id FROM suspended_user_ids)
  );
  RAISE NOTICE 'Deleted EquipmentSectors';

  -- Delete establishments owned by suspended users (will cascade to their data)
  DELETE FROM "Establishment" WHERE "ownerId" IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted establishments owned by suspended users';

  -- Finally, delete the suspended users
  DELETE FROM "User" WHERE id IN (SELECT id FROM suspended_user_ids);
  RAISE NOTICE 'Deleted all suspended users - % accounts removed', suspended_user_count;

  -- Clean up temp table
  DROP TABLE suspended_user_ids;
  
END $$;
