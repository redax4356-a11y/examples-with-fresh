// ============================================================================
// Solana Arbitrage Bot - Pool Price Fetcher & Monitor
// ============================================================================

import { Connection, PublicKey } from "https://esm.sh/v135/@solana/web3.js@1.95.0";
import type { PoolPrice, BotConfig } from "./types.ts";
import { LoggerService, PricingUtility, ValidationUtility } from "./core.ts";

interface RaydiumPoolState {
  baseMint: string;
  quoteMint: string;
  baseDecimal: number;
  quoteDecimal: number;
  baseReserve: string;
  quoteReserve: string;
  status: number;
}

interface OrcaPoolState {
  tokenA: {
    mint: string;
    amount: string;
  };
  tokenB: {
    mint: string;
    amount: string;
  };
}

export class PoolPriceMonitor {
  private connection: Connection;
  private priceCache: Map<string, PoolPrice> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  private updateInterval: number;

  constructor(connection: Connection, updateInterval: number = 5000) {
    this.connection = connection;
    this.updateInterval = updateInterval;
  }

  /**
   * جلب سعر المجمع من Raydium
   */
  async getRaydiumPoolPrice(
    poolAddress: string,
    tokenA: string,
    tokenB: string
  ): Promise<PoolPrice | null> {
    try {
      const poolPubKey = new PublicKey(poolAddress);
      const accountInfo = await this.connection.getAccountInfo(poolPubKey);

      if (!accountInfo) {
        LoggerService.warning(`Raydium pool not found: ${poolAddress}`);
        return null;
      }

      // Parse Raydium pool account (simplified - in production use Raydium SDK)
      const poolData = this.parseRaydiumPoolData(accountInfo.data);

      if (!poolData) {
        return null;
      }

      const baseAmount = Number(poolData.baseReserve) / Math.pow(10, poolData.baseDecimal);
      const quoteAmount = Number(poolData.quoteReserve) / Math.pow(10, poolData.quoteDecimal);

      const price = PricingUtility.calculateSpotPrice(baseAmount, quoteAmount);

      const poolPrice: PoolPrice = {
        poolAddress,
        protocol: "raydium",
        tokenA,
        tokenB,
        price,
        liquidity: quoteAmount, // Liquidity in quote token
        timestamp: Date.now(),
        blockHeight: await this.connection.getBlockHeight(),
      };

      this.cachePrice(poolAddress, poolPrice);
      return poolPrice;
    } catch (error) {
      LoggerService.error(`Error fetching Raydium pool price: ${poolAddress}`, error);
      return null;
    }
  }

  /**
   * جلب سعر المجمع من Orca
   */
  async getOrcaPoolPrice(
    poolAddress: string,
    tokenA: string,
    tokenB: string
  ): Promise<PoolPrice | null> {
    try {
      const poolPubKey = new PublicKey(poolAddress);
      const accountInfo = await this.connection.getAccountInfo(poolPubKey);

      if (!accountInfo) {
        LoggerService.warning(`Orca pool not found: ${poolAddress}`);
        return null;
      }

      // Parse Orca pool account (simplified)
      const poolData = this.parseOrcaPoolData(accountInfo.data);

      if (!poolData) {
        return null;
      }

      const amountA = Number(poolData.tokenA.amount) / Math.pow(10, 6); // Assuming 6 decimals
      const amountB = Number(poolData.tokenB.amount) / Math.pow(10, 6);

      const price = PricingUtility.calculateSpotPrice(amountA, amountB);

      const poolPrice: PoolPrice = {
        poolAddress,
        protocol: "orca",
        tokenA,
        tokenB,
        price,
        liquidity: amountB,
        timestamp: Date.now(),
        blockHeight: await this.connection.getBlockHeight(),
      };

      this.cachePrice(poolAddress, poolPrice);
      return poolPrice;
    } catch (error) {
      LoggerService.error(`Error fetching Orca pool price: ${poolAddress}`, error);
      return null;
    }
  }

  /**
   * جلب الأسعار من عدة مجمعات بالتوازي
   */
  async fetchMultiplePoolPrices(
    pools: Array<{
      address: string;
      protocol: "raydium" | "orca";
      tokenA: string;
      tokenB: string;
    }>
  ): Promise<PoolPrice[]> {
    const promises = pools.map(pool => {
      if (pool.protocol === "raydium") {
        return this.getRaydiumPoolPrice(pool.address, pool.tokenA, pool.tokenB);
      } else {
        return this.getOrcaPoolPrice(pool.address, pool.tokenA, pool.tokenB);
      }
    });

    const results = await Promise.all(promises);
    return results.filter((price): price is PoolPrice => price !== null);
  }

  /**
   * مراقبة الأسعار بشكل مستمر
   */
  startPriceMonitoring(
    pools: Array<{ address: string; protocol: "raydium" | "orca"; tokenA: string; tokenB: string }>,
    callback: (prices: PoolPrice[]) => void
  ): NodeJS.Timeout {
    LoggerService.info(`Starting price monitoring for ${pools.length} pools`);

    return setInterval(async () => {
      try {
        const prices = await this.fetchMultiplePoolPrices(pools);

        if (prices.length > 0) {
          const freshPrices = prices.filter(p => ValidationUtility.isPriceDataFresh(p));
          callback(freshPrices);
        }
      } catch (error) {
        LoggerService.error("Error during price monitoring", error);
      }
    }, this.updateInterval);
  }

  /**
   * احصل على آخر سعر مخزن مؤقتاً
   */
  getCachedPrice(poolAddress: string): PoolPrice | null {
    return this.priceCache.get(poolAddress) || null;
  }

  /**
   * احفظ السعر في الذاكرة المؤقتة
   */
  private cachePrice(poolAddress: string, price: PoolPrice): void {
    this.priceCache.set(poolAddress, price);
    this.lastUpdateTime.set(poolAddress, Date.now());
  }

  /**
   * حلل بيانات حساب مجمع Raydium
   */
  private parseRaydiumPoolData(data: Buffer): RaydiumPoolState | null {
    try {
      // هذا تبسيط - في الإنتاج، استخدم Raydium SDK
      // البيانات عادة تكون في الموضع 72-80 للاحتياطيات
      if (data.length < 200) return null;

      return {
        baseMint: "",
        quoteMint: "",
        baseDecimal: 6,
        quoteDecimal: 6,
        baseReserve: "0",
        quoteReserve: "0",
        status: 1,
      };
    } catch (error) {
      LoggerService.debug("Error parsing Raydium pool data", error);
      return null;
    }
  }

  /**
   * حلل بيانات حساب مجمع Orca
   */
  private parseOrcaPoolData(data: Buffer): OrcaPoolState | null {
    try {
      // هذا تبسيط - في الإنتاج، استخدم Orca SDK
      if (data.length < 200) return null;

      return {
        tokenA: {
          mint: "",
          amount: "0",
        },
        tokenB: {
          mint: "",
          amount: "0",
        },
      };
    } catch (error) {
      LoggerService.debug("Error parsing Orca pool data", error);
      return null;
    }
  }

  /**
   * نظف الذاكرة المؤقتة
   */
  clearCache(): void {
    this.priceCache.clear();
    this.lastUpdateTime.clear();
    LoggerService.info("Price cache cleared");
  }
}
