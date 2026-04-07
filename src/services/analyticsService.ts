import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export interface PaymentSummary {
  totalPayments: number;
  confirmedPayments: number;
  pendingPayments: number;
  expiredPayments: number;
  failedPayments: number;
  conversionRate: number;       // confirmed / (confirmed + expired + failed), as 0–100
  totalRevenueEth: string;      // sum of confirmed ETH payments
  byNetwork: {
    mainnet: { total: number; confirmed: number; revenueEth: string };
    testnet: { total: number; confirmed: number; revenueEth: string };
  };
}

export interface DailyVolume {
  date: string;        // ISO date string YYYY-MM-DD
  count: number;       // number of confirmed payments
  revenueEth: string;  // total ETH confirmed that day
}

export const analyticsService = {
  async getSummary(userId: string): Promise<PaymentSummary> {
    // Count payments grouped by status using Prisma groupBy
    const countsByStatus = await prisma.payment.groupBy({
      by: ['status'],
      where: { userId },
      _count: { id: true },
    });

    const counts: Record<string, number> = {};
    for (const row of countsByStatus) {
      counts[row.status] = row._count.id;
    }

    const confirmed = counts['CONFIRMED'] ?? 0;
    const pending   = counts['PENDING']   ?? 0;
    const expired   = counts['EXPIRED']   ?? 0;
    const failed    = counts['FAILED']    ?? 0;
    const total     = confirmed + pending + expired + failed;

    // Conversion rate: confirmed out of all finalised payments
    const finalised = confirmed + expired + failed;
    const conversionRate = finalised > 0 ? Math.round((confirmed / finalised) * 10000) / 100 : 0;

    // Sum of confirmed ETH
    const revenueResult = await prisma.payment.aggregate({
      where: { userId, status: 'CONFIRMED', currency: 'ETH' },
      _sum: { amount: true },
    });
    const totalRevenueEth = (revenueResult._sum.amount ?? new Prisma.Decimal(0)).toString();

    // Per-network breakdown
    const byNetworkRows = await prisma.payment.groupBy({
      by: ['network', 'status'],
      where: { userId },
      _count: { id: true },
    });

    const networkMap: Record<string, Record<string, number>> = {
      MAINNET: {}, TESTNET: {},
    };
    for (const row of byNetworkRows) {
      networkMap[row.network][row.status] = row._count.id;
    }

    const mainnetRevenue = await prisma.payment.aggregate({
      where: { userId, status: 'CONFIRMED', network: 'MAINNET', currency: 'ETH' },
      _sum: { amount: true },
    });
    const testnetRevenue = await prisma.payment.aggregate({
      where: { userId, status: 'CONFIRMED', network: 'TESTNET', currency: 'ETH' },
      _sum: { amount: true },
    });

    const mainnetCounts = networkMap['MAINNET'] ?? {};
    const testnetCounts = networkMap['TESTNET'] ?? {};

    return {
      totalPayments: total,
      confirmedPayments: confirmed,
      pendingPayments: pending,
      expiredPayments: expired,
      failedPayments: failed,
      conversionRate,
      totalRevenueEth,
      byNetwork: {
        mainnet: {
          total: Object.values(mainnetCounts).reduce((a, b) => a + b, 0),
          confirmed: mainnetCounts['CONFIRMED'] ?? 0,
          revenueEth: (mainnetRevenue._sum.amount ?? new Prisma.Decimal(0)).toString(),
        },
        testnet: {
          total: Object.values(testnetCounts).reduce((a, b) => a + b, 0),
          confirmed: testnetCounts['CONFIRMED'] ?? 0,
          revenueEth: (testnetRevenue._sum.amount ?? new Prisma.Decimal(0)).toString(),
        },
      },
    };
  },

  async getDailyVolume(userId: string, days: number = 30): Promise<DailyVolume[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // Use raw SQL for date_trunc grouping — not supported by Prisma groupBy
    const rows = await prisma.$queryRaw<
      { date: Date; count: bigint; revenue: string | null }[]
    >(Prisma.sql`
      SELECT
        date_trunc('day', created_at) AS date,
        COUNT(*)                      AS count,
        SUM(amount)::text             AS revenue
      FROM payments
      WHERE user_id   = ${userId}
        AND status    = 'CONFIRMED'
        AND created_at >= ${since}
      GROUP BY date_trunc('day', created_at)
      ORDER BY date ASC
    `);

    // Fill in missing days with zero values so charts have a continuous x-axis
    const resultMap = new Map<string, DailyVolume>();
    for (const row of rows) {
      const date = row.date.toISOString().slice(0, 10);
      resultMap.set(date, {
        date,
        count: Number(row.count),
        revenueEth: row.revenue ?? '0',
      });
    }

    const filled: DailyVolume[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const date = d.toISOString().slice(0, 10);
      filled.push(resultMap.get(date) ?? { date, count: 0, revenueEth: '0' });
    }

    return filled;
  },
};
