import nodemailer from 'nodemailer';
import { env, isProduction } from '../config/env';
import { SupportedLanguage, t } from '../config/i18n';

interface PasswordResetEmailInput {
  to: string;
  resetUrl: string;
  lng: SupportedLanguage;
  userName: string;
}

function isSmtpConfigured(): boolean {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function createTransport() {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
}

function buildPasswordResetHtml(resetUrl: string, userName: string, lng: SupportedLanguage): string {
  const subject = t('auth.emails.resetPassword.subject', lng);
  const greeting = t('auth.emails.resetPassword.greeting', lng, { name: userName });
  const body = t('auth.emails.resetPassword.body', lng);
  const cta = t('auth.emails.resetPassword.cta', lng);
  const footer = t('auth.emails.resetPassword.footer', lng);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2>${subject}</h2>
      <p>${greeting}</p>
      <p>${body}</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">${cta}</a></p>
      <p style="word-break:break-all;color:#555;">${resetUrl}</p>
      <p style="color:#666;font-size:12px;">${footer}</p>
    </div>
  `;
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
  const subject = t('auth.emails.resetPassword.subject', input.lng);
  const text = `${t('auth.emails.resetPassword.body', input.lng)}\n\n${input.resetUrl}`;

  if (isSmtpConfigured()) {
    const transport = createTransport();
    await transport.sendMail({
      from: env.smtp.from,
      to: input.to,
      subject,
      text,
      html: buildPasswordResetHtml(input.resetUrl, input.userName, input.lng),
    });
    return;
  }

  if (!isProduction) {
    console.info('[Needforfit][email:dev] Password reset link generated');
    console.info(`  To: ${input.to}`);
    console.info(`  Link: ${input.resetUrl}`);
    return;
  }

  console.warn('[Needforfit][email] SMTP is not configured. Password reset email was not sent.');
}

export const emailService = {
  sendPasswordResetEmail,
  isSmtpConfigured,
};
