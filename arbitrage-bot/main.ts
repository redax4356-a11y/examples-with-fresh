// ============================================================================
// Solana Arbitrage Bot - Main Entry Point & Configuration
// ============================================================================

import { SolanaArbitrageBot } from "./arbitrage-bot/bot.ts";
import { BotConfigManager } from "./arbitrage-bot/core.ts";
import type { BotConfig, BotPool } from "./arbitrage-bot/types.ts";
import { LoggerService } from "./arbitrage-bot/core.ts";

// قراءة الإعدادات من متغيرات البيئة
const config: BotConfig = {
  rpcUrl: Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com",
  wsUrl: Deno.env.get("SOLANA_WS_URL") || "wss://api.mainnet-beta.solana.com",
  privateKey: Deno.env.get("SOLANA_PRIVATE_KEY") || "",
  minProfitThreshold: parseFloat(Deno.env.get("MIN_PROFIT_THRESHOLD") || "0.001"),
  maxSlippageTolerance: parseFloat(Deno.env.get("MAX_SLIPPAGE_TOLERANCE") || "2.0"),
  maxGasPrice: parseInt(Deno.env.get("MAX_GAS_PRICE") || "10000"),
  flashLoanMaxFee: parseFloat(Deno.env.get("FLASH_LOAN_MAX_FEE") || "0.1"),
  poolUpdateInterval: parseInt(Deno.env.get("POOL_UPDATE_INTERVAL") || "5000"),
  backrunWindowSize: parseInt(Deno.env.get("BACKRUN_WINDOW_SIZE") || "10"),
  executeOnBlockConfirmation: Deno.env.get("EXECUTE_ON_BLOCK_CONFIRMATION") !== "false",
};

// تعريف المجمعات المراد مراقبتها
const poolsToMonitor: BotPool[] = [
  // SOL/USDC - Raydium
  {
    address: "8qDfsGbREQvzGB7XdrN3xmRyQq33EnGaQvmjT9TSqxU",
    protocol: "raydium",
    tokenA: "So11111111111111111111111111111111111111112", // SOL
    tokenB: "EPjFWaLb3odcccccccccccccccccccccccccccccc", // USDC
  },
  // SOL/USDC - Orca
  {
    address: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1jolooT",
    protocol: "orca",
    tokenA: "So11111111111111111111111111111111111111112", // SOL
    tokenB: "EPjFWaLb3odcccccccccccccccccccccccccccccc", // USDC
  },
  // USDT/USDC - Raydium
  {
    address: "Eo7WjKq67rjm34souPYvVipPKP6M7PvEEi7DTqxV5Cxc",
    protocol: "raydium",
    tokenA: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenEPs", // USDT
    tokenB: "EPjFWaLb3odcccccccccccccccccccccccccccccc", // USDC
  },
];

/**
 * دالة البدء الرئيسية
 */
async function main(): Promise<void> {
  try {
    LoggerService.info("=".repeat(80));
    LoggerService.info("🚀 Solana Arbitrage Bot - Starting");
    LoggerService.info("=".repeat(80));

    // التحقق من الإعدادات
    const validation = BotConfigManager.validateConfig(config);
    if (!validation.valid) {
      LoggerService.error("Configuration Validation Failed", validation.errors);
      Deno.exit(1);
    }

    // إنشاء البوت
    const bot = new SolanaArbitrageBot(config);

    // إضافة المجمعات
    bot.addPools(poolsToMonitor);

    // بدء البوت
    await bot.start();

    // طباعة الحالة كل 30 ثانية
    const statusInterval = setInterval(() => {
      const status = bot.getStatus();
      LoggerService.info("📊 Bot Status", {
        running: status.isRunning,
        pools: status.poolsMonitored,
        stats: status.stats,
      });
    }, 30000);

    // التعامل مع إشارات الإيقاف
    Deno.addSignalListener("SIGINT", () => {
      LoggerService.info("Received SIGINT signal - stopping bot");
      clearInterval(statusInterval);
      bot.stop();
      Deno.exit(0);
    });

    Deno.addSignalListener("SIGTERM", () => {
      LoggerService.info("Received SIGTERM signal - stopping bot");
      clearInterval(statusInterval);
      bot.stop();
      Deno.exit(0);
    });
  } catch (error) {
    LoggerService.error("Fatal Error", error);
    Deno.exit(1);
  }
}

// تشغيل البوت
if (import.meta.main) {
  main();
}

export { config, poolsToMonitor, main };
