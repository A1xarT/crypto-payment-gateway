/**
 * Promotes an existing user to admin (or creates a new admin account).
 *
 * Usage:
 *   npx ts-node scripts/create-admin.ts --email admin@example.com
 *   npx ts-node scripts/create-admin.ts --email admin@example.com --password supersecret123
 *
 * The --password flag is only used when creating a brand-new account.
 * If the user already exists, only isAdmin is toggled to true.
 */

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function parseArgs(): { email: string; password?: string } {
  const args = process.argv.slice(2);
  const emailIndex = args.indexOf('--email');
  const passwordIndex = args.indexOf('--password');

  if (emailIndex === -1 || !args[emailIndex + 1]) {
    console.error('Usage: npx ts-node scripts/create-admin.ts --email <email> [--password <password>]');
    process.exit(1);
  }

  return {
    email: args[emailIndex + 1],
    password: passwordIndex !== -1 ? args[passwordIndex + 1] : undefined,
  };
}

async function main() {
  const { email, password } = parseArgs();

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.isAdmin) {
      console.log(`✓ ${email} is already an admin.`);
    } else {
      await prisma.user.update({ where: { email }, data: { isAdmin: true } });
      console.log(`✓ ${email} has been promoted to admin.`);
    }
  } else {
    if (!password) {
      console.error(`User ${email} does not exist. Provide --password to create a new admin account.`);
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('Password must be at least 8 characters.');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, passwordHash, isAdmin: true },
    });
    console.log(`✓ Admin account created for ${email}.`);
  }
}

main()
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
