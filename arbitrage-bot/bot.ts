// ============================================================================
// Solana Arbitrage Bot - Main Bot Engine
// ============================================================================

import { Connection, Keypair } from "https://esm.sh/v135/@solana/web3.js@1.95.0";
import type { BotConfig, ArbitrageOpportunity, PoolPrice } from "./types.ts";
import { BotConfigManager, SolanaConnectionManager, LoggerService, ValidationUtility } from "./core.ts";
import { PoolPriceMonitor } from "./pool-monitor.ts";
import { FlashLoanManager } from "./flash-loan.ts";
import { OpportunityDetector, BackrunEngine } from "./opportunity-detector.ts";

interface BotPool {
  address: string;
  protocol: "raydium" | "orca";
  tokenA: string;
  tokenB: string;
}

export class SolanaArbitrageBot {
  private config: BotConfig;
  private connectionManager: SolanaConnectionManager;
  private poolMonitor: PoolPriceMonitor;
  private flushLoanManager: FlashLoanManager;
  private opportunityDetector: OpportunityDetector;
  private backrunEngine: BackrunEngine;
  private isRunning: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private moniteredPools: BotPool[] = [];

  constructor(config?: BotConfig) {
    // تحميل الإعدادات
    this.config = config || BotConfigManager.getDefaultConfig();

    // التحقق من صحة الإعدادات
    const validation = BotConfigManager.validateConfig(this.config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
    }

    LoggerService.info("Bot Configuration Loaded", {
      minProfit: this.config.minProfitThreshold + " SOL",
      maxSlippage: this.config.maxSlippageTolerance + "%",
      poolUpdateInterval: this.config.poolUpdateInterval + "ms",
    });

    // تهيئة المديرين
    this.connectionManager = new SolanaConnectionManager(this.config);
    this.poolMonitor = new PoolPriceMonitor(
      this.connectionManager.getConnection(),
      this.config.poolUpdateInterval
    );
    this.flushLoanManager = new FlashLoanManager(
      this.connectionManager.getConnection(),
      this.connectionManager.getKeypair()
    );
    this.opportunityDetector = new OpportunityDetector(
      this.config.minProfitThreshold,
      this.config.maxSlippageTolerance
    );
    this.backrunEngine = new BackrunEngine(this.config.backrunWindowSize);
  }

  /**
   * إضافة مجمع للمراقبة
   */
  addPool(pool: BotPool): void {
    if (this.moniteredPools.some(p => p.address === pool.address)) {
      LoggerService.warning(`Pool already monitored: ${pool.address}`);
      return;
    }

    this.moniteredPools.push(pool);
    LoggerService.info(`Pool added to monitoring: ${pool.address}`, {
      protocol: pool.protocol,
      tokens: `${pool.tokenA}/${pool.tokenB}`,
    });
  }

  /**
   * إضافة عدة مجمعات
   */
  addPools(pools: BotPool[]): void {
    pools.forEach(pool => this.addPool(pool));
  }

  /**
   * بدء البوت
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      LoggerService.warning("Bot is already running");
      return;
    }

    if (this.moniteredPools.length === 0) {
      throw new Error("No pools configured for monitoring");
    }

    this.isRunning = true;

    try {
      // التحقق من رصيد المحفظة
      const balance = await this.connectionManager.getBalance();
      LoggerService.info("Wallet Balance", {
        balance: balance.toFixed(8) + " SOL",
        address: this.connectionManager.getWalletAddress().toString(),
      });

      if (balance < 0.001) {
        LoggerService.warning("⚠️  Low balance - minimum 0.001 SOL recommended for gas fees");
      }

      // التحقق من دعم Flash Loan
      const supportsFlashLoan = await this.flushLoanManager.verifyFlashLoanSupport("jupiter");
      if (!supportsFlashLoan) {
        LoggerService.warning("Flash Loan not available - arbitrage may be limited");
      }

      // بدء مراقبة الأسعار
      this.startPriceMonitoring();

      LoggerService.success("🚀 Arbitrage Bot Started", {
        pools: this.moniteredPools.length,
        updateInterval: this.config.poolUpdateInterval + "ms",
        minProfit: this.config.minProfitThreshold + " SOL",
      });
    } catch (error) {
      this.isRunning = false;
      LoggerService.error("Failed to start bot", error);
      throw error;
    }
  }

  /**
   * إيقاف البوت
   */
  stop(): void {
    if (!this.isRunning) {
      LoggerService.warning("Bot is not running");
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isRunning = false;
    this.poolMonitor.clearCache();

    // اطبع الإحصائيات النهائية
    const stats = this.backrunEngine.getStats();
    LoggerService.success("🛑 Arbitrage Bot Stopped", {
      successfulTrades: stats.successfulTrades,
      totalProfit: stats.totalProfit.toFixed(8) + " SOL",
      averageProfit: stats.averageProfitPerTrade.toFixed(8) + " SOL",
    });
  }

  /**
   * بدء مراقبة الأسعار ومعالجة الفرص
   */
  private startPriceMonitoring(): void {
    this.monitoringInterval = this.poolMonitor.startPriceMonitoring(
      this.moniteredPools,
      async (prices: PoolPrice[]) => {
        try {
          await this.processPrices(prices);
        } catch (error) {
          LoggerService.error("Error processing prices", error);
        }
      }
    );
  }

  /**
   * معالجة الأسعار المحدثة والبحث عن فرص
   */
  private async processPrices(prices: PoolPrice[]): Promise<void> {
    if (prices.length === 0) return;

    // تسجيل الأسعار في السجل التاريخي
    prices.forEach(price => this.opportunityDetector.recordPrice(price));

    // كشف فرص المراجحة
    const blockHeight = prices[0].blockHeight;
    const opportunities = this.opportunityDetector.detectArbitrageOpportunities(
      prices,
      blockHeight
    );

    if (opportunities.length === 0) return;

    // معالجة كل فرصة
    for (const opportunity of opportunities) {
      await this.executeArbitrage(opportunity);
    }
  }

  /**
   * تنفيذ المراجحة
   */
  private async executeArbitrage(opportunity: ArbitrageOpportunity): Promise<void> {
    try {
      LoggerService.info("Executing Arbitrage", {
        pair: opportunity.tokenA + "/" + opportunity.tokenB,
        priceDiff: opportunity.priceDifference.toFixed(2) + "%",
        profit: opportunity.estimatedProfit.toFixed(8) + " SOL",
      });

      // استخدام Flash Loan
      const loanAmount = 1; // 1 SOL كبداية
      const result = await this.flushLoanManager.executeFlashLoanArbitrage(
        opportunity,
        loanAmount,
        {
          amount: loanAmount,
          protocol: "jupiter",
          feePercentage: 0.05,
          repaymentAmount: loanAmount * 1.0005,
        }
      );

      if (result.success) {
        // تسجيل الصفقة الناجحة
        this.backrunEngine.recordSuccessfulTrade(opportunity);

        LoggerService.success("✅ Arbitrage Executed Successfully", {
          profit: result.profit.toFixed(8) + " SOL",
          fee: result.flashLoanFee.toFixed(8) + " SOL",
          slippage: result.slippage.toFixed(2) + "%",
          tx: result.txSignature,
        });
      } else {
        LoggerService.warning("Arbitrage Execution Failed", {
          error: result.error,
          pair: opportunity.tokenA + "/" + opportunity.tokenB,
        });
      }
    } catch (error) {
      LoggerService.error("Arbitrage execution error", error);
    }
  }

  /**
   * احصل على الإحصائيات الحالية
   */
  getStats() {
    return this.backrunEngine.getStats();
  }

  /**
   * احصل على حالة البوت
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      poolsMonitored: this.moniteredPools.length,
      stats: this.getStats(),
    };
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  resetStats(): void {
    this.backrunEngine.resetStats();
    LoggerService.info("Statistics reset");
  }
}

/**
 * دالة مساعدة لإنشاء وتشغيل البوت
 */
export async function createAndRunBot(poolConfigs: BotPool[], customConfig?: Partial<BotConfig>) {
  try {
    // إنشاء البوت بالإعدادات المخصصة
    const config = {
      ...BotConfigManager.getDefaultConfig(),
      ...customConfig,
    };

    const bot = new SolanaArbitrageBot(config);

    // إضافة المجمعات
    bot.addPools(poolConfigs);

    // بدء البوت
    await bot.start();

    return bot;
  } catch (error) {
    LoggerService.error("Failed to create and run bot", error);
    throw error;
  }
}
