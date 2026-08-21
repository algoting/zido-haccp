import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CleaningService } from '../cleaning/cleaning.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EstablishmentsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private cleaning: CleaningService,
  ) {}

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

    // 4) Initialize default cleaning zones
    await this.cleaning.initializeDefaultZones(establishment.id);

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
    // Verify establishment exists (include owner for invitation emails)
    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      include: { owner: { select: { email: true, displayName: true } } },
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

    // Send invitation emails (fire-and-forget, don't block the response)
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.zidohaccp.com';
    const registerUrl = `${frontendUrl}/register`;
    const roleLabel = role === 'STAFF' ? 'Personnel' : 'Auditeur';
    const ownerName = establishment.owner.displayName || establishment.owner.email;

    this.mail.sendMail(
      establishment.owner.email,
      `Zido HACCP — Invitation envoyée à ${email}`,
      this.mail.buildHtml(`
        <h2 style="margin:0 0 8px;font-size:22px;color:#1B365D;text-align:center;">Invitation envoyée ✓</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#5C6370;text-align:center;line-height:1.6;">
          Votre invitation a bien été envoyée à <strong>${email}</strong> en tant que <strong>${roleLabel}</strong> de l'établissement <strong>${establishment.name}</strong>.
        </p>
        <div style="background:#F0FDF4;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#166534;text-align:center;">
            Cette personne recevra un e-mail avec un lien pour créer son compte et rejoindre votre établissement.
          </p>
        </div>
        <div style="border-top:1px solid #e8eaee;padding-top:16px;">
          <p style="margin:0;font-size:12px;color:#b0b8c3;text-align:center;">Si vous n'avez pas effectué cette action, contactez notre support.</p>
        </div>
      `),
    ).catch((err) => console.error('[addTeamMember] Owner confirmation email failed:', err.message));

    this.mail.sendMail(
      email,
      `Vous avez été invité à rejoindre ${establishment.name} sur Zido HACCP`,
      this.mail.buildHtml(`
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#CCFBF1,#99F6E4);line-height:64px;font-size:28px;">🎉</div>
        </div>
        <h2 style="margin:0 0 8px;font-size:22px;color:#1B365D;text-align:center;">Vous êtes invité !</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#5C6370;text-align:center;line-height:1.6;">
          <strong>${ownerName}</strong> vous a invité à rejoindre l'établissement <strong>${establishment.name}</strong> en tant que <strong>${roleLabel}</strong>.
        </p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${registerUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0D9488,#14B8A6);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(13,148,136,0.3);">
            Créer mon compte
          </a>
        </div>
        <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-align:center;">Ou copiez ce lien dans votre navigateur :</p>
        <p style="margin:0 0 24px;font-size:12px;color:#0D9488;text-align:center;word-break:break-all;">${registerUrl}</p>
        <div style="border-top:1px solid #e8eaee;padding-top:16px;">
          <p style="margin:0;font-size:12px;color:#b0b8c3;text-align:center;">Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.</p>
        </div>
      `),
    ).catch((err) => console.error('[addTeamMember] Staff invitation email failed:', err.message));

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
