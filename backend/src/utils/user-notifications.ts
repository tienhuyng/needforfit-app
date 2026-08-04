import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export async function createUserNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  payload?: Prisma.InputJsonValue
) {
  return prisma.userNotification.create({
    data: {
      userId,
      type,
      title,
      body,
      payload,
    },
  });
}

export function formatUserName(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || email;
}
