/**
 * Verifies that your Ethereum RPC endpoints are reachable and responding.
 *
 * Usage:
 *   npx ts-node scripts/test-rpc.ts
 *
 * Reads ETH_RPC_URL and TESTNET_RPC_URL from .env
 */

import dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';

async function checkEndpoint(label: string, url: string): Promise<void> {
  console.log(`\nChecking ${label}...`);
  console.log(`  URL: ${url}`);

  if (url.includes('YOUR_') || url.includes('YOUR_PROJECT_ID')) {
    console.error('  ✗ URL is still a placeholder — update it in your .env file');
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork(),
    ]);
    console.log(`  ✓ Connected — chain ID: ${network.chainId}, latest block: ${blockNumber}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ Failed: ${message}`);
  }
}

async function main() {
  const mainnetUrl = process.env.ETH_RPC_URL ?? process.env.BLOCKCHAIN_RPC_URL ?? '';
  const testnetUrl = process.env.TESTNET_RPC_URL ?? '';

  if (!mainnetUrl) {
    console.error('ETH_RPC_URL is not set in your .env file.');
    process.exit(1);
  }

  await checkEndpoint('Mainnet (ETH_RPC_URL)', mainnetUrl);

  if (testnetUrl) {
    await checkEndpoint('Testnet/Sepolia (TESTNET_RPC_URL)', testnetUrl);
  } else {
    console.log('\nTestnet: TESTNET_RPC_URL not set — skipping (only needed for sk_test_ keys)');
  }

  console.log('');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
