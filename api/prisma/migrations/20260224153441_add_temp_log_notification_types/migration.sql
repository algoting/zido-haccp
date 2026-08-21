/*
  Add new notification types for temperature log reminders
*/

-- AlterEnum - Add new notification types
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'TEMP_LOG_DUE_SOON';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'TEMP_LOG_OVERDUE';
