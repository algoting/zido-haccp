import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new InternalServerErrorException('JWT_SECRET must be set in production');
    }
    return 'dev_secret_DO_NOT_USE_IN_PROD';
  }
  return secret;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  private getMailTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpHost || !smtpUser || !smtpPassword) return null;

    return nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: smtpUser, pass: smtpPassword },
    });
  }

  private async sendMail(to: string, subject: string, html: string) {
    const transporter = this.getMailTransporter();
    if (!transporter) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Email to ${to}: ${subject}`);
      }
      return;
    }
    const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER;
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await transporter.sendMail({ from: `"Zido HACCP" <${fromAddr}>`, to, subject, html });
        return;
      } catch (err: any) {
        console.error(`[MAIL ERROR] attempt ${attempt + 1}/${maxRetries + 1}:`, err.message);
        if (attempt < maxRetries && err.responseCode === 454) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
  }

  private buildEmailHtml(content: string): string {
    const logoUrl = (process.env.FRONTEND_URL || 'https://app.zidohaccp.com') + '/logo.png';
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#f0fdfa;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(27,54,93,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1B365D 0%,#0D9488 100%);padding:28px 40px;text-align:center;">
          <img src="${logoUrl}" alt="Zido HACCP" width="120" height="auto" style="display:block;margin:0 auto 8px;max-width:120px;height:auto;" />
          <p style="margin:0;font-size:11px;color:#99F6E4;letter-spacing:2.5px;text-transform:uppercase;font-family:'Inter',sans-serif;font-weight:500;">Sécurité alimentaire simplifiée</p>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:40px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:#f8fffe;border-top:1px solid #e0f2f1;padding:24px 40px;text-align:center;font-family:'Inter',sans-serif;">
          <img src="${logoUrl}" alt="Zido HACCP" width="48" height="auto" style="display:block;margin:0 auto 10px;max-width:48px;height:auto;opacity:0.6;" />
          <p style="margin:0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} Zido HACCP. Tous droits réservés.</p>
          <p style="margin:8px 0 0;font-size:11px;color:#b0b8c3;">Cet e-mail a été envoyé automatiquement. Merci de ne pas y répondre.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private async sendVerificationEmail(user: { id: string; email: string }) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: tokenHash },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://app.zidohaccp.com';
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.sendMail(
      user.email,
      'Zido HACCP — Vérifiez votre adresse e-mail',
      this.buildEmailHtml(`
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#CCFBF1,#99F6E4);line-height:64px;font-size:28px;">✉️</div>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;color:#1B365D;text-align:center;">Bienvenue sur Zido HACCP !</h2>
          <p style="margin:0 0 24px;font-size:15px;color:#5C6370;text-align:center;line-height:1.6;">
            Merci de vous être inscrit. Pour activer votre compte, veuillez confirmer votre adresse e-mail.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${verifyUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0D9488,#14B8A6);color:#ffffff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(13,148,136,0.3);">
              Vérifier mon e-mail
            </a>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-align:center;">Ou copiez ce lien dans votre navigateur :</p>
          <p style="margin:0 0 24px;font-size:12px;color:#0D9488;text-align:center;word-break:break-all;">${verifyUrl}</p>
          <div style="border-top:1px solid #e8eaee;padding-top:16px;">
            <p style="margin:0;font-size:12px;color:#b0b8c3;text-align:center;">Si vous n'avez pas créé de compte sur Zido HACCP, ignorez simplement cet e-mail.</p>
          </div>
      `),
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Verification URL for ${user.email}: ${verifyUrl}`);
    }
  }

  async register(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // If user doesn't exist, create it (default role for now)
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);

      const created = await this.prisma.user.create({
        data: {
          email,
          role: 'OWNER',
          passwordHash,
          emailVerified: true,
        },
      });

      // Create default establishment for the user
      const establishment = await this.prisma.establishment.create({
        data: {
          name: `${email}'s Establishment`,
          ownerId: created.id,
        },
      });

      // Link establishment to user and set emailVerified to true
      const updatedUser = await this.prisma.user.update({
        where: { id: created.id },
        data: { establishmentId: establishment.id, emailVerified: true },
      });

      // Create subscription record with ACTIVE status and SERENITE plan (free access mode)
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 10);
      await this.prisma.subscription.create({
        data: {
          establishmentId: establishment.id,
          plan: 'SERENITE',
          status: 'ACTIVE',
          currentPeriodEnd: farFuture,
        },
      });

      // Try sending verification email asynchronously (do not block)
      this.sendVerificationEmail({ id: updatedUser.id, email: updatedUser.email }).catch(() => {});

      const payload = {
        id: updatedUser.id,
        sub: updatedUser.id,
        role: updatedUser.role,
        establishmentId: updatedUser.establishmentId ?? null,
      };

      const access_token = jwt.sign(
        payload,
        getJwtSecret(),
        { expiresIn: '7d' },
      );

      return {
        access_token,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          establishmentId: updatedUser.establishmentId,
          emailVerified: true,
          createdAt: updatedUser.createdAt,
        },
      };
    }

    // If user exists and already has password:
    if (user.passwordHash) {
      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (passwordValid) {
        // Automatically log them in seamlessly!
        const payload = {
          id: user.id,
          sub: user.id,
          role: user.role,
          establishmentId: user.establishmentId ?? null,
        };
        const access_token = jwt.sign(
          payload,
          getJwtSecret(),
          { expiresIn: '7d' },
        );
        return {
          access_token,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            profilePictureUrl: user.profilePictureUrl,
            role: user.role,
            establishmentId: user.establishmentId,
            emailVerified: true,
            createdAt: user.createdAt,
          },
        };
      }

      throw new ConflictException(
        'Cet e-mail est déjà inscrit. Connectez-vous ou cliquez sur Mot de passe oublié.',
      );
    }

    // ✅ User exists (created by admin or owner), set password now — skip verification
    const passwordHash = await bcrypt.hash(password, 10);

    const updated = await this.prisma.user.update({
      where: { email },
      data: { passwordHash, emailVerified: true },
    });

    const payload = {
      id: updated.id,
      sub: updated.id,
      role: updated.role,
      establishmentId: updated.establishmentId ?? null,
    };

    const access_token = jwt.sign(
      payload,
      getJwtSecret(),
      { expiresIn: '7d' },
    );

    return {
      access_token,
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        establishmentId: updated.establishmentId,
        emailVerified: true,
        createdAt: updated.createdAt,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.suspended) {
      throw new UnauthorizedException('Votre compte a été suspendu. Contactez l\'administrateur.');
    }

    const payload = {
      id: user.id,
      sub: user.id,
      role: user.role,
      establishmentId: user.establishmentId ?? null,
    };

    const access_token = jwt.sign(
      payload,
      getJwtSecret(),
      { expiresIn: '7d' },
    );

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        profilePictureUrl: user.profilePictureUrl,
        role: user.role,
        establishmentId: user.establishmentId,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { establishment: true },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      profilePictureUrl: user.profilePictureUrl,
      role: user.role,
      establishmentId: user.establishmentId,
      emailVerified: user.emailVerified,
      establishment: user.establishment,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(
    userId: string,
    dto: {
      displayName?: string;
      establishmentName?: string;
      address?: string;
      phone?: string;
      description?: string;
      timezone?: string;
    },
  ) {
    // Update user
    if (dto.displayName !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { displayName: dto.displayName },
      });
    }

    // Update establishment
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.establishmentId) {
      const updateData: any = {};
      if (dto.establishmentName) updateData.name = dto.establishmentName;
      if (dto.address !== undefined) updateData.address = dto.address;
      if (dto.phone !== undefined) updateData.phone = dto.phone;
      if (dto.description !== undefined)
        updateData.description = dto.description;
      if (dto.timezone !== undefined) updateData.timezone = dto.timezone;

      if (Object.keys(updateData).length > 0) {
        await this.prisma.establishment.update({
          where: { id: user.establishmentId },
          data: updateData,
        });
      }
    }

    return this.getProfile(userId);
  }

  async uploadProfilePicture(userId: string, file: any) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    // Convert file to base64 or use file service
    // For MVP, we'll create a data URL
    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;

    // Update user with profile picture URL
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profilePictureUrl: dataUrl },
      include: { establishment: true },
    });

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      profilePictureUrl: updated.profilePictureUrl,
      role: updated.role,
      establishmentId: updated.establishmentId,
      establishment: updated.establishment,
      createdAt: updated.createdAt,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Mot de passe modifié avec succès' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'Si un compte existe avec cet e-mail, un lien de réinitialisation a été envoyé.' };
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpires: resetExpires,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://app.zidohaccp.com';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    try {
      await this.sendMail(
        user.email,
        'Zido HACCP — Réinitialisation de votre mot de passe',
        this.buildEmailHtml(`
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#CCFBF1,#99F6E4);line-height:64px;font-size:28px;">🔒</div>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;color:#1B365D;text-align:center;">Réinitialisation de mot de passe</h2>
          <p style="margin:0 0 24px;font-size:15px;color:#5C6370;text-align:center;line-height:1.6;">
            Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0D9488,#14B8A6);color:#ffffff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(13,148,136,0.3);">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <div style="background-color:#FEF3C7;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#92400E;text-align:center;">⏱ Ce lien expire dans <strong>1 heure</strong>.</p>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-align:center;">Ou copiez ce lien dans votre navigateur :</p>
          <p style="margin:0 0 24px;font-size:12px;color:#0D9488;text-align:center;word-break:break-all;">${resetUrl}</p>
          <div style="border-top:1px solid #e8eaee;padding-top:16px;">
            <p style="margin:0;font-size:12px;color:#b0b8c3;text-align:center;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail. Votre mot de passe restera inchangé.</p>
          </div>
        `),
      );
    } catch (err) {
      console.error('[forgotPassword] Email send failed, but returning success to prevent enumeration');
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset URL for ${email}: ${resetUrl}`);
    }

    return { message: 'Si un compte existe avec cet e-mail, un lien de réinitialisation a été envoyé.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async verifyEmail(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: tokenHash },
    });

    if (!user) {
      throw new BadRequestException('Lien de vérification invalide');
    }

    if (user.emailVerified) {
      return { message: 'E-mail déjà vérifié' };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    return { message: 'E-mail vérifié avec succès' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    if (user.emailVerified) {
      return { message: 'E-mail déjà vérifié' };
    }

    await this.sendVerificationEmail({ id: user.id, email: user.email });

    return { message: 'E-mail de vérification envoyé' };
  }
}
