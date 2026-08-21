import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private getTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    if (!host || !user || !pass) return null;

    return nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE !== 'false', // true by default (port 465 SSL)
      auth: { user, pass },
    });
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.log(`[MAIL] No SMTP configured — skipping: ${subject} → ${to}`);
      return;
    }
    const from = `"Zido HACCP" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        await transporter.sendMail({ from, to, subject, html });
        return;
      } catch (err: any) {
        console.error(`[MAIL ERROR] attempt ${attempt + 1}/3:`, err.message);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
  }

  buildHtml(content: string): string {
    const logoUrl = (process.env.FRONTEND_URL || 'https://app.zidohaccp.com') + '/logo.png';
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0fdfa;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(27,54,93,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1B365D 0%,#0D9488 100%);padding:28px 40px;text-align:center;">
          <img src="${logoUrl}" alt="Zido HACCP" width="120" style="display:block;margin:0 auto 8px;" />
          <p style="margin:0;font-size:11px;color:#99F6E4;letter-spacing:2.5px;text-transform:uppercase;font-weight:500;">Sécurité alimentaire simplifiée</p>
        </td></tr>
        <tr><td style="padding:40px;">${content}</td></tr>
        <tr><td style="background:#f8fffe;border-top:1px solid #e0f2f1;padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">© ${year} Zido HACCP. Tous droits réservés.</p>
          <p style="margin:8px 0 0;font-size:11px;color:#b0b8c3;">Cet e-mail a été envoyé automatiquement. Merci de ne pas y répondre.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
