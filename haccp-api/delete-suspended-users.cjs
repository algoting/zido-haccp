require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteSuspendedUsers() {
  try {
    console.log('Starting deletion of suspended users...\n');

    // Find all suspended users
    const suspendedUsers = await prisma.user.findMany({
      where: { suspended: true },
      include: {
        ownedEstablishment: true,
        establishment: true,
      },
    });

    console.log(`Found ${suspendedUsers.length} suspended users:`);
    suspendedUsers.forEach((user) => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });
    console.log('');

    for (const user of suspendedUsers) {
      console.log(`Processing user: ${user.email}`);

      // If user owns an establishment, delete it first (with cascade)
      if (user.ownedEstablishment) {
        console.log(`  - Deleting owned establishment: ${user.ownedEstablishment.name}`);
        await prisma.establishment.delete({
          where: { id: user.ownedEstablishment.id },
        });
      }

      // Delete all records created by this user
      // These will cascade due to onDelete: Cascade in schema
      console.log(`  - Deleting related records...`);

      // AuditLogs where user is the actor
      await prisma.auditLog.deleteMany({
        where: { actorUserId: user.id },
      });

      // CorrectiveActions
      await prisma.correctiveAction.deleteMany({
        where: { createdByUserId: user.id },
      });

      // CleaningTaskChecks
      await prisma.cleaningTaskCheck.deleteMany({
        where: { checkedByUserId: user.id },
      });

      // OilChecks
      await prisma.oilCheck.deleteMany({
        where: { recordedByUserId: user.id },
      });

      // SupportMessages
      await prisma.supportMessage.deleteMany({
        where: { senderUserId: user.id },
      });

      // SupportTickets (will cascade delete messages)
      await prisma.supportTicket.deleteMany({
        where: { createdByUserId: user.id },
      });

      // Equipment created by this user
      await prisma.equipment.deleteMany({
        where: { createdByUserId: user.id },
      });

      // PreparationBatches
      await prisma.preparationBatch.deleteMany({
        where: {
          OR: [
            { createdByUserId: user.id },
            { destroyedByUserId: user.id },
          ],
        },
      });

      // InternalPreparations
      await prisma.internalPreparation.deleteMany({
        where: { createdByUserId: user.id },
      });

      // Products
      await prisma.product.deleteMany({
        where: { createdBy: user.id },
      });

      // GoodsReceptions
      await prisma.goodsReception.deleteMany({
        where: { createdBy: user.id },
      });

      // TemperatureLogs
      await prisma.temperatureLog.deleteMany({
        where: { recordedByUserId: user.id },
      });

      // NotificationEvents
      await prisma.notificationEvent.deleteMany({
        where: { userId: user.id },
      });

      // Incidents closed by this user
      await prisma.incident.updateMany({
        where: { closedByUserId: user.id },
        data: { closedByUserId: null },
      });

      // Remove user from establishment members
      await prisma.establishment.updateMany({
        where: { members: { some: { id: user.id } } },
        data: { members: { disconnect: { id: user.id } } },
      });

      // Finally, delete the user
      await prisma.user.delete({
        where: { id: user.id },
      });

      console.log(`  ✓ User deleted: ${user.email}\n`);
    }

    console.log('✓ All suspended users and their related data have been deleted.');
  } catch (error) {
    console.error('Error deleting suspended users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSuspendedUsers();
