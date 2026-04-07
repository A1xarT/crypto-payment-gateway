import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Crypto Payment Gateway API',
      version: '1.0.0',
      description: 'Self-hosted Ethereum payment gateway. Accept crypto payments via dedicated deposit addresses, HMAC-signed webhooks, and a hosted checkout page.',
    },
    security: [{ bearerAuth: [] }],
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        AuthResult: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-...' },
                email: { type: 'string', format: 'email', example: 'user@example.com' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        Block: {
          type: 'object',
          properties: {
            hash: { type: 'string', example: '0xabc123...' },
            number: { type: 'integer', example: 21000000 },
            parentHash: { type: 'string', example: '0xdef456...' },
            timestamp: { type: 'integer', example: 1700000000 },
            miner: { type: 'string', example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
            difficulty: { type: 'string', example: '0' },
            totalDifficulty: { type: 'string', example: '58750003716598352816469' },
            size: { type: 'integer', example: 45000 },
            gasLimit: { type: 'integer', example: 30000000 },
            gasUsed: { type: 'integer', example: 15000000 },
            transactionCount: { type: 'integer', example: 120 },
            transactions: { type: 'array', items: { type: 'string' }, example: ['0xabc...'] },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            hash: { type: 'string', example: '0xabc123...' },
            blockHash: { type: 'string', example: '0xdef456...' },
            blockNumber: { type: 'integer', example: 21000000 },
            from: { type: 'string', example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
            to: { type: 'string', nullable: true, example: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B' },
            value: { type: 'string', example: '0xde0b6b3a7640000' },
            gas: { type: 'integer', example: 21000 },
            gasPrice: { type: 'string', example: '0x3b9aca00' },
            nonce: { type: 'integer', example: 42 },
            input: { type: 'string', example: '0x' },
            transactionIndex: { type: 'integer', example: 0 },
          },
        },
        TransactionReceipt: {
          type: 'object',
          properties: {
            transactionHash: { type: 'string', example: '0xabc123...' },
            blockHash: { type: 'string', example: '0xdef456...' },
            blockNumber: { type: 'integer', example: 21000000 },
            from: { type: 'string', example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
            to: { type: 'string', nullable: true, example: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B' },
            contractAddress: { type: 'string', nullable: true, example: null },
            status: { type: 'boolean', example: true },
            gasUsed: { type: 'integer', example: 21000 },
            cumulativeGasUsed: { type: 'integer', example: 21000 },
            logs: { type: 'array', items: { $ref: '#/components/schemas/Log' } },
          },
        },
        Log: {
          type: 'object',
          properties: {
            address: { type: 'string', example: '0xabc...' },
            topics: { type: 'array', items: { type: 'string' } },
            data: { type: 'string', example: '0x' },
            blockNumber: { type: 'integer', example: 21000000 },
            transactionHash: { type: 'string', example: '0xabc...' },
            logIndex: { type: 'integer', example: 0 },
          },
        },
        AddressInfo: {
          type: 'object',
          properties: {
            address: { type: 'string', example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
            balance: { type: 'string', example: '0xde0b6b3a7640000' },
            transactionCount: { type: 'integer', example: 1000 },
            isContract: { type: 'boolean', example: false },
            code: { type: 'string', description: 'Only present for contracts', example: '0x608060...' },
          },
        },
        NetworkStats: {
          type: 'object',
          properties: {
            latestBlock: { type: 'integer', example: 21000000 },
            networkId: { type: 'string', example: '1' },
            gasPrice: { type: 'string', example: '0x3b9aca00' },
            peerCount: { type: 'integer', example: 50 },
          },
        },
        PaymentResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
            address: { type: 'string', example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
            amount: { type: 'string', example: '0.05' },
            currency: { type: 'string', enum: ['ETH'], example: 'ETH' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED'], example: 'PENDING' },
            network: { type: 'string', enum: ['MAINNET', 'TESTNET'], example: 'MAINNET' },
            reference: { type: 'string', nullable: true, example: 'order_12345', description: 'Merchant-assigned reference (e.g. order ID)' },
            metadata: { type: 'object', nullable: true, additionalProperties: true, example: { orderId: '12345', customerId: 'cus_abc' }, description: 'Arbitrary key-value metadata attached to the payment' },
            expiresAt: { type: 'string', format: 'date-time', nullable: true, example: '2026-04-06T16:00:00.000Z' },
          },
        },
        PaymentSummary: {
          type: 'object',
          properties: {
            totalPayments:     { type: 'integer', example: 142 },
            confirmedPayments: { type: 'integer', example: 98 },
            pendingPayments:   { type: 'integer', example: 12 },
            expiredPayments:   { type: 'integer', example: 28 },
            failedPayments:    { type: 'integer', example: 4 },
            conversionRate:    { type: 'number',  example: 75.97, description: 'Confirmed / finalised payments × 100' },
            totalRevenueEth:   { type: 'string',  example: '4.835' },
            byNetwork: {
              type: 'object',
              properties: {
                mainnet: {
                  type: 'object',
                  properties: {
                    total:      { type: 'integer', example: 120 },
                    confirmed:  { type: 'integer', example: 85 },
                    revenueEth: { type: 'string',  example: '4.2' },
                  },
                },
                testnet: {
                  type: 'object',
                  properties: {
                    total:      { type: 'integer', example: 22 },
                    confirmed:  { type: 'integer', example: 13 },
                    revenueEth: { type: 'string',  example: '0.635' },
                  },
                },
              },
            },
          },
        },
        DailyVolume: {
          type: 'object',
          properties: {
            date:       { type: 'string', format: 'date', example: '2026-04-01' },
            count:      { type: 'integer', example: 5 },
            revenueEth: { type: 'string',  example: '0.25' },
          },
        },
        ApiKeyPair: {
          type: 'object',
          properties: {
            secretKey: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                fullKey: { type: 'string', example: 'sk_live_a3f1c2d4e5b6...', description: 'Full key — shown once only' },
                keyPrefix: { type: 'string', example: 'sk_live_a3f1c2d4' },
                type: { type: 'string', example: 'SECRET' },
              },
            },
            publishableKey: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                fullKey: { type: 'string', example: 'pk_live_b2e3d4f5...', description: 'Full key — shown once only' },
                keyPrefix: { type: 'string', example: 'pk_live_b2e3d4f5' },
                type: { type: 'string', example: 'PUBLISHABLE' },
              },
            },
          },
        },
        ApiKeyRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Production' },
            keyPrefix: { type: 'string', example: 'sk_live_a3f1c2d4', description: 'First 16 characters — safe to display' },
            type: { type: 'string', enum: ['SECRET', 'PUBLISHABLE'], example: 'SECRET' },
            isActive: { type: 'boolean', example: true },
            lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AccountResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-...' },
            email: { type: 'string', format: 'email', example: 'merchant@example.com' },
            payoutAddress: {
              type: 'string',
              nullable: true,
              example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
              description: 'Ethereum address where confirmed funds are swept to',
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        WebhookResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a3f1c2d4-...' },
            url: { type: 'string', format: 'uri', example: 'https://myshop.com/webhooks/crypto' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            secret: {
              type: 'string',
              description: 'HMAC-SHA256 signing secret — returned once on creation only',
              example: 'a3f1c2d4e5b6...',
            },
          },
        },
        WebhookDeliveryResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'b2e3d4f5-...' },
            paymentId: { type: 'string', format: 'uuid', example: 'f47ac10b-...' },
            status: {
              type: 'string',
              enum: ['PENDING', 'DELIVERED', 'FAILED'],
              example: 'DELIVERED',
            },
            responseCode: { type: 'integer', nullable: true, example: 200 },
            responseBody: { type: 'string', nullable: true, example: 'OK' },
            attemptCount: { type: 'integer', example: 1 },
            nextRetryAt: { type: 'string', format: 'date-time', nullable: true, example: null },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Invalid block number' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Registration and login' },
      { name: 'Analytics', description: 'Revenue and volume statistics' },
      { name: 'Account', description: 'Merchant profile and payout address' },
      { name: 'API Keys', description: 'Generate and manage API key pairs' },
      { name: 'Payments', description: 'Create and manage crypto payments' },
      { name: 'Webhooks', description: 'Register callback endpoints and view delivery history' },
      { name: 'Admin', description: 'Super-admin endpoints (requires isAdmin flag on JWT)' },
      { name: 'Checkout', description: 'Hosted checkout sessions (Stripe Checkout-style)' },
      { name: 'Health', description: 'API health check' },
      { name: 'Network', description: 'Ethereum network information' },
      { name: 'Blocks', description: 'Block data' },
      { name: 'Transactions', description: 'Transaction data' },
      { name: 'Addresses', description: 'Address / account data' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
