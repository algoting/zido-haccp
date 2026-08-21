import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async createTicket(
    establishmentId: string,
    userId: string,
    category: 'PAYMENT' | 'CONFIGURATION' | 'BUG' | 'OTHER',
    message: string,
  ) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        establishmentId,
        createdByUserId: userId,
        category,
      },
      include: { createdBy: { select: { email: true } } },
    });

    // Create first message
    await this.prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderUserId: userId,
        message,
      },
    });

    return ticket;
  }

  async getTickets(establishmentId: string, skip = 0, take = 50) {
    return this.prisma.supportTicket.findMany({
      where: { establishmentId },
      include: {
        createdBy: { select: { email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async getTicket(id: string, establishmentId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, establishmentId },
      include: {
        createdBy: { select: { email: true } },
        messages: {
          include: { sender: { select: { email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket non trouvé');
    }

    return ticket;
  }

  async addMessage(
    ticketId: string,
    establishmentId: string,
    userId: string,
    message: string,
    attachmentUrl?: string,
  ) {
    // Verify ticket belongs to establishment
    await this.getTicket(ticketId, establishmentId);

    return this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderUserId: userId,
        message,
        attachmentUrl,
      },
      include: { sender: { select: { email: true } } },
    });
  }

  async closeTicket(id: string, establishmentId: string) {
    await this.getTicket(id, establishmentId);

    return this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  // Super Admin only
  async getAllTickets(skip = 0, take = 50) {
    return this.prisma.supportTicket.findMany({
      include: {
        establishment: { select: { name: true } },
        createdBy: { select: { email: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async getTicketBySuperAdmin(id: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        establishment: { select: { name: true } },
        createdBy: { select: { email: true } },
        messages: {
          include: { sender: { select: { email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }
}
