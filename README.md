# Crypto Payment Gateway

A self-hosted Ethereum payment processor API. Merchants integrate it to accept ETH payments without a third-party intermediary — no Coinbase Commerce, no Stripe Crypto. You own the infrastructure, the keys, and the funds flow.

Built with Node.js, TypeScript, Express, PostgreSQL (Prisma), and Docker.

---

## Features

### Payments
- Create payments with an ETH amount or a **fiat amount** (USD → ETH auto-converted via live exchange rate)
- Each payment gets a dedicated Ethereum deposit address — HD wallet, private key stored AES-256 encrypted at rest
- Background blockchain monitor transitions `PENDING → CONFIRMED` automatically when funds arrive
- Handles underpayment and expiry events
- Public status polling endpoint (`GET /payments/:id/status`) — safe to call from a browser with no credentials
- Idempotency keys on create prevent duplicate payments on network retry

### Authentication & API Keys
- JWT login/logout with token revocation blacklist
- **Publishable keys** (`pk_live_` / `pk_test_`) for client-side use — can only create payments, nothing else
- **Secret keys** (`sk_live_` / `sk_test_`) for server-side — full access
- Test mode (keys prefixed `*_test_`) routes payments to Sepolia testnet automatically

### Checkout
- Hosted checkout sessions — generate a URL and redirect the customer
- Server-rendered pay page with ETH address, QR code, and live countdown timer

### Webhooks
- Register a callback URL to receive `payment.confirmed`, `payment.expired`, `payment.underpaid` events
- Payloads signed with **HMAC-SHA256** (`X-Webhook-Signature`) — same pattern as Stripe
- Automatic retry on delivery failure: 3 attempts, 5-minute then 30-minute backoff
- Delivery history per webhook (last 50 attempts with response codes and bodies)
- Test endpoint — fire a signed test payload to your URL before going live

### Blockchain Explorer
- Block, transaction, and address lookup
- Network stats (latest block, gas price, peer count)

### Observability & Security
- Prometheus metrics at `GET /metrics` (firewalled by nginx in production)
- Pino structured JSON logging with request IDs
- Per-IP and per-API-key rate limiting
- Helmet security headers
- Machine-readable error codes on every error response
- Swagger/OpenAPI docs auto-generated at `GET /api-docs`

---

## Architecture

```
nginx (TLS termination, HTTP→HTTPS redirect)
  └── Express API (port 3000)
        ├── Authentication middleware (JWT + API keys)
        ├── Rate limiter
        ├── Payment routes
        ├── Webhook routes
        ├── Checkout routes
        ├── Blockchain explorer routes
        └── Background workers
              ├── Payment monitor (polls Ethereum RPC every 30s)
              └── Webhook retry poller (checks due retries every 60s)
PostgreSQL (Prisma ORM)
```

---

## Quick Start

### Prerequisites
- Docker and Docker Compose
- An Ethereum RPC endpoint ([Alchemy](https://alchemy.com) or [Infura](https://infura.io) free tier works)

### 1. Clone and configure

```bash
git clone https://github.com/your-username/crypto-payment-gateway.git
cd crypto-payment-gateway

cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
JWT_SECRET=        # openssl rand -hex 64
ENCRYPTION_KEY=    # openssl rand -hex 32  ← keep this safe, funds depend on it
ETH_RPC_URL=       # your Alchemy/Infura mainnet endpoint
TESTNET_RPC_URL=   # your Alchemy/Infura Sepolia endpoint
```

> **Important:** `ENCRYPTION_KEY` encrypts every payment address private key. If you lose it, any funds in unswept deposit addresses become permanently inaccessible.

### 2. Start

```bash
docker compose up -d
```

This starts PostgreSQL, runs Prisma migrations, and starts the API on port 3000.

### 3. Create the first admin

```bash
docker compose exec api npm run create-admin
```

### 4. Explore the API

Swagger UI is available at `http://localhost:3000/api-docs`.

---

## Production Deployment

The `docker-compose.prod.yml` adds nginx with TLS termination. Prerequisites:

1. A domain pointing to your server
2. A TLS certificate (Let's Encrypt):

```bash
export DOMAIN=api.yourdomain.com
certbot certonly --standalone -d $DOMAIN
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem   nginx/certs/
```

3. Start with the production override:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Port 3000 is no longer exposed — all traffic goes through nginx on 443.

---

## API Overview

### Authentication

All endpoints (except `GET /payments/:id/status`) require a `Bearer` token:

```
Authorization: Bearer sk_live_...   # secret key — server-side only
Authorization: Bearer pk_live_...   # publishable key — safe for client-side
Authorization: Bearer <jwt>         # JWT from POST /api/v1/auth/login
```

### Core Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/payments` | pk or sk | Create a payment |
| `GET` | `/api/v1/payments/:id/status` | None | Public status poll |
| `GET` | `/api/v1/payments/:id` | sk | Full payment detail |
| `GET` | `/api/v1/payments` | sk | List payments |
| `POST` | `/api/v1/webhooks` | sk | Register a webhook |
| `POST` | `/api/v1/webhooks/:id/test` | sk | Test a webhook |
| `GET` | `/api/v1/webhooks/:id/deliveries` | sk | Delivery history |
| `POST` | `/api/v1/checkout/sessions` | sk | Create checkout session |
| `POST` | `/api/v1/auth/login` | — | Get JWT |
| `GET` | `/api-docs` | — | Swagger UI |

### Create a payment (ETH amount)

```bash
curl -X POST https://api.yourdomain.com/api/v1/payments \
  -H "Authorization: Bearer pk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"amount": 0.05, "currency": "ETH", "reference": "order_123"}'
```

### Create a payment (fiat amount)

```bash
curl -X POST https://api.yourdomain.com/api/v1/payments \
  -H "Authorization: Bearer pk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"fiatAmount": 49.99, "fiatCurrency": "USD", "reference": "order_123"}'
```

Response includes the deposit address and the ETH equivalent at the time of the request.

### Verify webhook signatures

Every delivery includes an `X-Webhook-Signature` header:

```
X-Webhook-Signature: sha256=<hmac-hex>
```

Verify it in your callback handler:

```typescript
import crypto from 'crypto';

function isValidSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

---

## Error Responses

All errors include a machine-readable `code` field:

```json
{
  "success": false,
  "error": "amount must be a positive number",
  "code": "INVALID_AMOUNT"
}
```

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Missing, invalid, or revoked credentials |
| `SECRET_KEY_REQUIRED` | Publishable key used on a secret-only endpoint |
| `INVALID_AMOUNT` | Amount missing or not a positive number |
| `INVALID_CURRENCY` | Unsupported currency |
| `INVALID_REFERENCE` | Reference exceeds 255 characters |
| `PAYMENT_NOT_FOUND` | No payment with that ID |
| `WEBHOOK_NOT_FOUND` | No webhook with that ID |
| `WEBHOOK_INACTIVE` | Webhook has been deactivated |
| `RATE_UNAVAILABLE` | Could not fetch ETH/USD exchange rate |
| `INTERNAL_ERROR` | Unexpected server error |

---

## TypeScript SDK

A typed SDK is included in `sdk/`:

```bash
cd sdk && npm install && npm run build
```

---

## Development

```bash
npm install
cp .env.example .env   # fill in values
docker compose up -d db  # start only postgres
npm run dev              # ts-node with hot reload
```

### Tests

```bash
npm test              # unit + integration
npm run test:coverage # with coverage report
```

### Database

```bash
npx prisma studio          # visual DB browser
npx prisma migrate dev      # create a new migration
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22, TypeScript |
| Framework | Express 4 |
| Database | PostgreSQL 16, Prisma ORM |
| Blockchain | ethers.js v6 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Crypto | Node.js `crypto` (AES-256-CBC, HMAC-SHA256) |
| HTTP client | axios |
| Logging | Pino |
| Metrics | prom-client (Prometheus) |
| Docs | swagger-jsdoc + swagger-ui-express |
| Containerization | Docker, Docker Compose, nginx |

---

## License

MIT
