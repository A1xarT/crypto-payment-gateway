import { Router } from 'express';
import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';
import { config } from '../config';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: API health check
 *     description: >
 *       Returns the operational status of the API, database, and Ethereum RPC.
 *       A 200 response means the database is reachable. RPC failure downgrades
 *       to `degraded` but does not return 503.
 *     responses:
 *       200:
 *         description: All systems operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [ok, degraded]
 *                       example: ok
 *                     checks:
 *                       type: object
 *                       properties:
 *                         api:
 *                           type: string
 *                           enum: [ok]
 *                         database:
 *                           type: string
 *                           enum: [ok, down]
 *                         rpc:
 *                           type: string
 *                           enum: [ok, degraded]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       503:
 *         description: Database is unreachable
 */
router.get('/', async (_req, res) => {
  const checks: Record<string, 'ok' | 'degraded' | 'down'> = {
    api: 'ok',
    database: 'down',
    rpc: 'degraded',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'down';
  }

  try {
    const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    await provider.getBlockNumber();
    checks.rpc = 'ok';
  } catch {
    checks.rpc = 'degraded';
  }

  const overallOk = checks.database === 'ok';

  res.status(overallOk ? 200 : 503).json({
    success: overallOk,
    data: {
      status: overallOk ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
