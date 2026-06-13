/**
 * @file prismaT.ts
 * @module config/prismaT
 * @description
 * Second Prisma client instance connecting to the Tenant Database (Supabase #2).
 * Handles brand account, auth, preferences, team, and AI usage data.
 *
 * SEPARATE FROM: config/prisma.ts (customer/order/campaign data on Supabase #1)
 * ENV VAR: DATABASE_URL_TENANT (port 6543 pooler) + DIRECT_URL_TENANT (port 5432)
 *
 * USAGE: import { prismaT } from './prismaT'
 * Never mix prismaT queries with prisma queries in the same transaction.
 */

import { PrismaClient } from '@prisma/tenant-client';

const globalForPrismaT = globalThis as unknown as { prismaT: PrismaClient };

export const prismaT = globalForPrismaT.prismaT ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrismaT.prismaT = prismaT;
