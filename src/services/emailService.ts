import nodemailer from 'nodemailer';
import { logger } from '../lib/logger';

// ── Config ────────────────────────────────────────────────────────────────────

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function loadSmtpConfig(): SmtpConfig | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return {
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? '587', 10),
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: SMTP_FROM ?? SMTP_USER,
  };
}

function createTransport(smtpConfig: SmtpConfig) {
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
  });
}

// ── Templates ─────────────────────────────────────────────────────────────────

function paymentConfirmedHtml(paymentId: string, amountEth: string, address: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Payment Confirmed</h2>
      <p>A payment of <strong>${amountEth} ETH</strong> has been confirmed.</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Payment ID</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${paymentId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Address</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${address}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Amount</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${amountEth} ETH</td>
        </tr>
      </table>
    </div>
  `;
}

function paymentExpiredHtml(paymentId: string, amountEth: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Payment Expired</h2>
      <p>A payment request for <strong>${amountEth} ETH</strong> has expired without being paid.</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Payment ID</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${paymentId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Amount</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${amountEth} ETH</td>
        </tr>
      </table>
      <p style="color: #6b7280; font-size: 14px;">No action is required — the deposit address has been released.</p>
    </div>
  `;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const emailService = {
  isConfigured(): boolean {
    return loadSmtpConfig() !== null;
  },

  async sendPaymentConfirmed(
    toEmail: string,
    paymentId: string,
    amountEth: string,
    address: string
  ): Promise<void> {
    const smtpConfig = loadSmtpConfig();
    if (!smtpConfig) {
      logger.debug('[EmailService] SMTP not configured — skipping payment.confirmed email');
      return;
    }

    try {
      const transport = createTransport(smtpConfig);
      await transport.sendMail({
        from: smtpConfig.from,
        to: toEmail,
        subject: `Payment confirmed — ${amountEth} ETH received`,
        html: paymentConfirmedHtml(paymentId, amountEth, address),
      });
      logger.info({ paymentId, to: toEmail }, '[EmailService] payment.confirmed email sent');
    } catch (error) {
      // Email failures must not block the payment flow
      logger.error({ err: error, paymentId }, '[EmailService] Failed to send payment.confirmed email');
    }
  },

  async sendPaymentExpired(
    toEmail: string,
    paymentId: string,
    amountEth: string
  ): Promise<void> {
    const smtpConfig = loadSmtpConfig();
    if (!smtpConfig) {
      logger.debug('[EmailService] SMTP not configured — skipping payment.expired email');
      return;
    }

    try {
      const transport = createTransport(smtpConfig);
      await transport.sendMail({
        from: smtpConfig.from,
        to: toEmail,
        subject: `Payment expired — ${amountEth} ETH not received`,
        html: paymentExpiredHtml(paymentId, amountEth),
      });
      logger.info({ paymentId, to: toEmail }, '[EmailService] payment.expired email sent');
    } catch (error) {
      logger.error({ err: error, paymentId }, '[EmailService] Failed to send payment.expired email');
    }
  },
};
