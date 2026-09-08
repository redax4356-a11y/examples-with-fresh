// ============================================================================
// Solana Arbitrage Bot - Opportunity Detector & Backrun Engine
// ============================================================================

import type { ArbitrageOpportunity, PoolPrice, Transaction } from "./types.ts";
import { LoggerService, PricingUtility, ValidationUtility } from "./core.ts";

export class OpportunityDetector {
  private minProfitThreshold: number;
  private maxSlippageTolerance: number;
  private priceHistory: Map<string, PoolPrice[]> = new Map();

  constructor(minProfitThreshold: number, maxSlippageTolerance: number) {
    this.minProfitThreshold = minProfitThreshold;
    this.maxSlippageTolerance = maxSlippageTolerance;
  }

  /**
   * كشف فرص المراجحة من أسعار مجمعات متعددة
   */
  detectArbitrageOpportunities(
    pools: PoolPrice[],
    blockHeight: number
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    // تجميع الأسعار حسب أزواج التوكنات
    const tokenPairMap = this.groupPoolsByTokenPair(pools);

    // البحث عن أزواج مع اختلافات أسعار
    for (const [pairKey, poolsForPair] of tokenPairMap.entries()) {
      if (poolsForPair.length < 2) continue;

      // إيجاد أفضل سعر شراء وبيع
      const buyPool = poolsForPair.reduce((min, current) =>
        current.price < min.price ? current : min
      );

      const sellPool = poolsForPair.reduce((max, current) =>
        current.price > max.price ? current : max
      );

      if (buyPool.poolAddress === sellPool.poolAddress) continue;

      // حساب فرق السعر
      const priceDifference = ((sellPool.price - buyPool.price) / buyPool.price) * 100;

      if (priceDifference <= 0) continue;

      // تقدير الربح
      const estimatedProfit = this.estimateProfit(
        buyPool,
        sellPool,
        priceDifference
      );

      // إنشاء فرصة المراجحة
      const opportunity: ArbitrageOpportunity = {
        tokenA: buyPool.tokenA,
        tokenB: buyPool.tokenB,
        buyPool: {
          name: buyPool.protocol as any,
          poolAddress: buyPool.poolAddress,
          price: buyPool.price,
          liquidity: buyPool.liquidity,
        },
        sellPool: {
          name: sellPool.protocol as any,
          poolAddress: sellPool.poolAddress,
          price: sellPool.price,
          liquidity: sellPool.liquidity,
        },
        priceDifference,
        estimatedProfit,
        timestamp: Date.now(),
        blockHeight,
      };

      // التحقق من صحة الفرصة
      const validation = ValidationUtility.isOpportunityViable(
        opportunity,
        this.minProfitThreshold,
        this.maxSlippageTolerance
      );

      if (validation.viable) {
        opportunities.push(opportunity);
        LoggerService.info("🎯 Arbitrage Opportunity Detected", {
          tokens: `${opportunity.tokenA}/${opportunity.tokenB}`,
          priceDifference: priceDifference.toFixed(2) + "%",
          estimatedProfit: estimatedProfit.toFixed(8) + " SOL",
          buyFrom: buyPool.protocol,
          sellOn: sellPool.protocol,
        });
      } else {
        LoggerService.debug("Opportunity rejected", validation.reasons);
      }
    }

    return opportunities;
  }

  /**
   * تجميع المجمعات حسب أزواج التوكنات
   */
  private groupPoolsByTokenPair(
    pools: PoolPrice[]
  ): Map<string, PoolPrice[]> {
    const grouped = new Map<string, PoolPrice[]>();

    for (const pool of pools) {
      const key = [pool.tokenA, pool.tokenB].sort().join("|");
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(pool);
    }

    return grouped;
  }

  /**
   * تقدير الربح المحتمل
   */
  private estimateProfit(
    buyPool: PoolPrice,
    sellPool: PoolPrice,
    priceDifference: number
  ): number {
    // استخدم 1 SOL كحد أدنى للمحاكاة
    const baseAmount = 1;

    // حساب الناتج بعد الشراء
    const amountAfterBuy = PricingUtility.calculateAmountOut(
      baseAmount,
      buyPool.liquidity,
      buyPool.liquidity * buyPool.price,
      0.25 // رسم Raydium/Orca
    );

    // حساب الناتج بعد البيع
    const amountAfterSell = PricingUtility.calculateAmountOut(
      amountAfterBuy,
      sellPool.liquidity * sellPool.price,
      sellPool.liquidity,
      0.25
    );

    // صافي الربح
    const grossProfit = amountAfterSell - baseAmount;

    // خصم التكاليف المقدرة
    const estimatedGasCost = 0.001; // 0.001 SOL
    const estimatedFlashLoanFee = baseAmount * 0.0005; // 0.05% flash loan fee

    return Math.max(0, grossProfit - estimatedGasCost - estimatedFlashLoanFee);
  }

  /**
   * تسجيل سعر في السجل التاريخي
   */
  recordPrice(pool: PoolPrice): void {
    const key = pool.poolAddress;
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, []);
    }

    const history = this.priceHistory.get(key)!;
    history.push(pool);

    // احتفظ بآخر 100 سجل فقط
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * احصل على السجل التاريخي للأسعار
   */
  getPriceHistory(poolAddress: string): PoolPrice[] {
    return this.priceHistory.get(poolAddress) || [];
  }

  /**
   * حساب متوسط السعر على فترة
   */
  getAveragePrice(poolAddress: string, windowSize: number = 10): number {
    const history = this.getPriceHistory(poolAddress);
    if (history.length === 0) return 0;

    const window = history.slice(-windowSize);
    const sum = window.reduce((acc, p) => acc + p.price, 0);

    return sum / window.length;
  }

  /**
   * كشف التذبذبات في الأسعار
   */
  detectPriceVolatility(
    poolAddress: string,
    threshold: number = 2.0
  ): boolean {
    const history = this.getPriceHistory(poolAddress);
    if (history.length < 2) return false;

    const average = this.getAveragePrice(poolAddress);
    const lastPrice = history[history.length - 1].price;

    const percentageChange = Math.abs((lastPrice - average) / average) * 100;

    return percentageChange > threshold;
  }
}

/**
 * Backrun Engine - محرك تتبع وتنفيذ المعاملات
 */
export class BackrunEngine {
  private recentTransactions: Transaction[] = [];
  private blockWindow: number;
  private successfulTrades: ArbitrageOpportunity[] = [];

  constructor(blockWindowSize: number = 10) {
    this.blockWindow = blockWindowSize;
  }

  /**
   * تتبع معاملة جديدة
   */
  trackTransaction(tx: Transaction): void {
    this.recentTransactions.push(tx);

    // احتفظ بآخر N معاملة فقط
    if (this.recentTransactions.length > this.blockWindow * 100) {
      this.recentTransactions.shift();
    }

    LoggerService.debug("Transaction tracked", {
      signature: tx.signature,
      type: tx.type,
      profit: tx.profit,
    });
  }

  /**
   * احصل على المعاملات الحديثة
   */
  getRecentTransactions(limit: number = 50): Transaction[] {
    return this.recentTransactions.slice(-limit);
  }

  /**
   * تسجيل صفقة ناجحة
   */
  recordSuccessfulTrade(opportunity: ArbitrageOpportunity): void {
    this.successfulTrades.push(opportunity);

    LoggerService.success("Trade recorded", {
      tokens: opportunity.tokenA + "/" + opportunity.tokenB,
      profit: opportunity.estimatedProfit.toFixed(8) + " SOL",
    });
  }

  /**
   * احصل على الإحصائيات
   */
  getStats(): {
    successfulTrades: number;
    totalProfit: number;
    averageProfitPerTrade: number;
    recentTransactionCount: number;
  } {
    const totalProfit = this.successfulTrades.reduce((sum, t) => sum + t.estimatedProfit, 0);
    const successfulTrades = this.successfulTrades.length;

    return {
      successfulTrades,
      totalProfit,
      averageProfitPerTrade: successfulTrades > 0 ? totalProfit / successfulTrades : 0,
      recentTransactionCount: this.recentTransactions.length,
    };
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  resetStats(): void {
    this.successfulTrades = [];
    this.recentTransactions = [];
    LoggerService.info("Stats reset");
  }
}
