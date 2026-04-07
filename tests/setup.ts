// Silence logger output during tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Minimal required env vars so config doesn't crash
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';
process.env.BLOCKCHAIN_RPC_URL = 'http://localhost:8545';
process.env.TESTNET_RPC_URL = 'http://localhost:8546';
