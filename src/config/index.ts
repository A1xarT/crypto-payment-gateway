import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  blockchain: {
    // ETH_RPC_URL is the canonical name. BLOCKCHAIN_RPC_URL accepted for backwards compatibility.
    rpcUrl: process.env.ETH_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    testnetRpcUrl: process.env.TESTNET_RPC_URL || 'https://rpc.sepolia.org',
    network: process.env.BLOCKCHAIN_NETWORK || 'mainnet',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change_me_to_a_long_random_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  payment: {
    expiryMinutes: parseInt(process.env.PAYMENT_EXPIRY_MINUTES || '30', 10),
  },
};
