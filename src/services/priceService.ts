import axios from 'axios';
import { logger } from '../lib/logger';

const CACHE_TTL_MS = 60_000; // Refresh at most once per minute
const FETCH_TIMEOUT_MS = 5_000;

interface CachedRate {
  usdPerEth: number;
  fetchedAt: number;
}

let cachedRate: CachedRate | null = null;

export const priceService = {
  /**
   * Returns the current ETH/USD exchange rate.
   * Result is cached for 60 seconds to avoid hammering the price API.
   * Throws if the rate cannot be fetched and there is no cached value to fall back on.
   */
  async getEthUsdRate(): Promise<number> {
    if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL_MS) {
      return cachedRate.usdPerEth;
    }

    try {
      const priceResponse = await axios.get<{ ethereum: { usd: number } }>(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
        { timeout: FETCH_TIMEOUT_MS }
      );

      const usdPerEth = priceResponse.data.ethereum.usd;
      cachedRate = { usdPerEth, fetchedAt: Date.now() };
      return usdPerEth;
    } catch (error) {
      logger.error({ err: error }, '[PriceService] Failed to fetch ETH/USD rate');

      // Return stale cache rather than failing the request entirely
      if (cachedRate) {
        logger.warn('[PriceService] Using stale cached rate');
        return cachedRate.usdPerEth;
      }

      throw new Error('ETH/USD rate is currently unavailable. Please try again shortly.');
    }
  },

  /**
   * Converts a fiat amount to ETH using the live exchange rate.
   * Only USD is supported; throws for other currencies.
   */
  async convertFiatToEth(fiatAmount: number, fiatCurrency: string): Promise<{ ethAmount: number; exchangeRate: number }> {
    if (fiatCurrency !== 'USD') {
      throw new Error(`Unsupported fiat currency: ${fiatCurrency}. Only USD is supported.`);
    }

    const exchangeRate = await this.getEthUsdRate();
    const ethAmount = fiatAmount / exchangeRate;
    return { ethAmount, exchangeRate };
  },
};
