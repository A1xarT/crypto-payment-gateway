/**
 * Sends a test email to verify your SMTP configuration is working.
 *
 * Usage:
 *   npx ts-node scripts/test-email.ts --to you@example.com
 *
 * Reads SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM from .env
 */

import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

function parseArgs(): { to: string } {
  const args = process.argv.slice(2);
  const toIndex = args.indexOf('--to');
  if (toIndex === -1 || !args[toIndex + 1]) {
    console.error('Usage: npx ts-node scripts/test-email.ts --to <email>');
    process.exit(1);
  }
  return { to: args[toIndex + 1] };
}

async function main() {
  const { to } = parseArgs();
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('SMTP_HOST, SMTP_USER, and SMTP_PASS must be set in your .env file.');
    process.exit(1);
  }

  const port = parseInt(SMTP_PORT ?? '587', 10);
  const from = SMTP_FROM ?? SMTP_USER;

  console.log(`Connecting to ${SMTP_HOST}:${port} as ${SMTP_USER}...`);

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transport.verify();
  console.log('✓ SMTP connection verified.');

  const info = await transport.sendMail({
    from,
    to,
    subject: 'Crypto Gateway — SMTP test',
    html: `
      <div style="font-family: sans-serif; max-width: 480px;">
        <h2 style="color: #16a34a;">SMTP is working!</h2>
        <p>Your Crypto Payment Gateway email notifications are correctly configured.</p>
        <p style="color: #6b7280; font-size: 13px;">Sent at ${new Date().toISOString()}</p>
      </div>
    `,
  });

  console.log(`✓ Test email sent to ${to} (message ID: ${info.messageId})`);
}

main().catch((error) => {
  console.error('Failed:', error.message);
  process.exit(1);
});
