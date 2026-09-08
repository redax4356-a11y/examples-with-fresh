// ============================================================================
// Solana Arbitrage Bot - Core Configuration & Utilities
// ============================================================================

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "https://esm.sh/v135/@solana/web3.js@1.95.0";
import type { BotConfig, PoolPrice, ArbitrageOpportunity } from "./types.ts";

export class BotConfigManager {
  static getDefaultConfig(): BotConfig {
    return {
      rpcUrl: Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com",
      wsUrl: Deno.env.get("SOLANA_WS_URL") || "wss://api.mainnet-beta.solana.com",
      privateKey: Deno.env.get("SOLANA_PRIVATE_KEY") || "",
      minProfitThreshold: 0.001, // 0.001 SOL minimum
      maxSlippageTolerance: 2.0, // 2% max slippage
      maxGasPrice: 10000, // lamports
      flashLoanMaxFee: 0.1, // 0.1% flash loan fee
      poolUpdateInterval: 5000, // 5 seconds
      backrunWindowSize: 10, // Track last 10 blocks
      executeOnBlockConfirmation: true,
    };
  }

  static validateConfig(config: BotConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.rpcUrl) errors.push("RPC URL is required");
    if (!config.privateKey) errors.push("Private key is required");
    if (config.minProfitThreshold < 0) errors.push("Min profit must be >= 0");
    if (config.maxSlippageTolerance < 0 || config.maxSlippageTolerance > 100) {
      errors.push("Max slippage must be between 0-100%");
    }
    if (config.maxGasPrice < 1000) errors.push("Gas price too low");
    if (config.poolUpdateInterval < 1000) errors.push("Pool update interval must be >= 1000ms");

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export class SolanaConnectionManager {
  private connection: Connection;
  private keypair: Keypair;

  constructor(config: BotConfig) {
    this.connection = new Connection(config.rpcUrl, "confirmed");
    
    // Decode private key from base58
    const secretKey = Uint8Array.from(
      JSON.parse(`[${config.privateKey}]`)
    );
    this.keypair = Keypair.fromSecretKey(secretKey);
  }

  getConnection(): Connection {
    return this.connection;
  }

  getKeypair(): Keypair {
    return this.keypair;
  }

  getWalletAddress(): PublicKey {
    return this.keypair.publicKey;
  }

  async getBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.keypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async getTokenBalance(tokenAccount: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getTokenAccountBalance(tokenAccount);
      return balance.value.uiAmount || 0;
    } catch (error) {
      console.error("Error getting token balance:", error);
      return 0;
    }
  }

  async waitForConfirmation(signature: string, maxRetries: number = 30): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const status = await this.connection.getSignatureStatus(signature);
      if (status.value?.confirmationStatus === "confirmed" || status.value?.confirmationStatus === "finalized") {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  }
}

export class PricingUtility {
  /**
   * حساب سعر الصرف بناءً على رصيد المجمع (Pool Balance)
   * مثال: إذا كان المجمع يحتوي على 1000 Token A و 500 Token B
   * السعر = 500 / 1000 = 0.5 Token B per Token A
   */
  static calculateSpotPrice(
    reserveA: number,
    reserveB: number,
    feePercentage: number = 0.25
  ): number {
    // صيغة Uniswap V2: price = (reserveB / reserveA) * (1 - fee)
    const feeMultiplier = 1 - feePercentage / 100;
    return (reserveB / reserveA) * feeMultiplier;
  }

  /**
   * حساب مقدار Output من خلال صيغة CPMM (Constant Product Market Maker)
   * x * y = k
   */
  static calculateAmountOut(
    amountIn: number,
    reserveIn: number,
    reserveOut: number,
    feePercentage: number = 0.25
  ): number {
    const feeMultiplier = 1 - feePercentage / 100;
    const amountInWithFee = amountIn * feeMultiplier;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;
    return numerator / denominator;
  }

  /**
   * حساب الانزلاق (Slippage) الفعلي
   */
  static calculateSlippage(
    amountIn: number,
    expectedAmountOut: number,
    actualAmountOut: number
  ): number {
    const slippage = ((expectedAmountOut - actualAmountOut) / expectedAmountOut) * 100;
    return Math.max(0, slippage);
  }

  /**
   * حساب الربح الصافي بعد خصم الرسوم والانزلاق
   */
  static calculateNetProfit(
    buyAmount: number,
    buyPrice: number,
    sellPrice: number,
    gasFeeLamports: number,
    flashLoanFee: number,
    slippage: number = 0
  ): number {
    const costInSOL = buyAmount * buyPrice;
    const revenueInSOL = buyAmount * sellPrice * (1 - slippage / 100);
    const gasFeeInSOL = gasFeeLamports / LAMPORTS_PER_SOL;
    const flashLoanFeeInSOL = (costInSOL * flashLoanFee) / 100;

    return revenueInSOL - costInSOL - gasFeeInSOL - flashLoanFeeInSOL;
  }
}

export class LoggerService {
  static info(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ℹ️  ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }

  static error(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ${message}`, error || "");
  }

  static success(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }

  static warning(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] ⚠️  ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }

  static debug(message: string, data?: unknown): void {
    if (Deno.env.get("DEBUG") === "true") {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔍 ${message}`, data ? JSON.stringify(data, null, 2) : "");
    }
  }
}

export class ValidationUtility {
  /**
   * التحقق من جدوى الفرصة المتاحة
   */
  static isOpportunityViable(
    opportunity: ArbitrageOpportunity,
    minProfitThreshold: number,
    maxSlippageTolerance: number
  ): { viable: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (opportunity.priceDifference <= 0) {
      reasons.push("No price difference detected");
    }

    if (opportunity.estimatedProfit < minProfitThreshold) {
      reasons.push(
        `Profit (${opportunity.estimatedProfit.toFixed(6)} SOL) below threshold (${minProfitThreshold} SOL)`
      );
    }

    if (opportunity.priceDifference > 50) {
      reasons.push("Price difference suspiciously high - possible stale data");
    }

    // Check liquidity sufficiency
    const requiredLiquidity = opportunity.estimatedProfit * 10; // عامل أمان 10x
    if (opportunity.buyPool.liquidity < requiredLiquidity) {
      reasons.push(`Insufficient liquidity in buy pool`);
    }

    return {
      viable: reasons.length === 0,
      reasons,
    };
  }

  /**
   * التحقق من أن البيانات ليست قديمة جداً
   */
  static isPriceDataFresh(poolPrice: PoolPrice, maxAgeMs: number = 30000): boolean {
    const age = Date.now() - poolPrice.timestamp;
    return age <= maxAgeMs;
  }
}
