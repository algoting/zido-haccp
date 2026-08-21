-- Verify that all suspended users have been deleted
SELECT COUNT(*) as remaining_suspended_users FROM "User" WHERE suspended = true;
SELECT COUNT(*) as total_users FROM "User";
