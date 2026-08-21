import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EstablishmentsService {
  constructor(private prisma: PrismaService) {}

  async createForOwner(ownerId: string, name: string) {
    // 1) Prevent creating a second establishment for same owner
    const existing = await this.prisma.establishment.findFirst({
      where: { ownerId },
    });

    if (existing) {
      throw new BadRequestException('Le propriétaire a déjà un établissement');
    }

    // 2) Create establishment linked to the owner
    const establishment = await this.prisma.establishment.create({
      data: {
        name,
        ownerId,
      },
    });

    // ✅ 3) IMPORTANT: Make owner a MEMBER of their own establishment
    await this.prisma.user.update({
      where: { id: ownerId },
      data: { establishmentId: establishment.id },
    });

    return establishment;
  }

  async repairOwnerMembership(ownerId: string) {
    const est = await this.prisma.establishment.findFirst({
      where: { ownerId },
    });

    if (!est)
      throw new NotFoundException(
        'Aucun établissement trouvé pour ce propriétaire',
      );

    await this.prisma.user.update({
      where: { id: ownerId },
      data: { establishmentId: est.id },
    });

    return { ok: true, establishmentId: est.id };
  }

  async getTeamMembers(establishmentId: string) {
    const members = await this.prisma.user.findMany({
      where: {
        establishmentId,
        role: { in: ['STAFF', 'AUDITOR'] },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
    });

    return members;
  }

  async addTeamMember(
    establishmentId: string,
    email: string,
    role: 'STAFF' | 'AUDITOR',
  ) {
    // Verify establishment exists
    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
    });

    if (!establishment) {
      throw new NotFoundException('Établissement non trouvé');
    }

    // Check staff limit BEFORE creating/updating (max 3)
    if (role === 'STAFF') {
      const staffCount = await this.prisma.user.count({
        where: {
          establishmentId,
          role: 'STAFF',
        },
      });

      if (staffCount >= 3) {
        throw new BadRequestException(
          'Maximum 3 membres du personnel autorisés',
        );
      }
    }

    // Check for existing user with this email
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, create one (they'll set password on first login)
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          role,
          establishmentId,
        },
      });
    } else {
      // Prevent hijacking users from other establishments
      if (user.establishmentId && user.establishmentId !== establishmentId) {
        throw new ConflictException(
          'Cet utilisateur appartient déjà à un autre établissement',
        );
      }

      // Update existing user's role and establishment
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role,
          establishmentId,
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }

  async updateTeamMember(
    establishmentId: string,
    userId: string,
    role: 'STAFF' | 'AUDITOR',
  ) {
    // Verify user belongs to this establishment
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.establishmentId !== establishmentId) {
      throw new NotFoundException("Membre de l'équipe non trouvé");
    }

    // Check staff limit if changing to STAFF
    if (role === 'STAFF' && user.role !== 'STAFF') {
      const staffCount = await this.prisma.user.count({
        where: {
          establishmentId,
          role: 'STAFF',
        },
      });

      if (staffCount >= 3) {
        throw new BadRequestException(
          'Maximum 3 membres du personnel autorisés',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
    };
  }

  async removeTeamMember(establishmentId: string, userId: string) {
    // Verify user belongs to this establishment
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.establishmentId !== establishmentId) {
      throw new NotFoundException("Membre de l'équipe non trouvé");
    }

    // Remove user from establishment (set to null)
    await this.prisma.user.update({
      where: { id: userId },
      data: { establishmentId: null },
    });

    return { ok: true };
  }

  async resetTeamMemberPassword(
    establishmentId: string,
    userId: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.establishmentId !== establishmentId) {
      throw new NotFoundException("Membre de l'équipe non trouvé");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Mot de passe du membre réinitialisé avec succès' };
  }
}
