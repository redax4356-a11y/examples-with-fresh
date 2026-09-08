// ============================================================================
// Solana Arbitrage Bot - Main Entry Point (Updated)
// ============================================================================

import { ConfigManager, parsePoolsFromEnv } from "./config.ts";
import { LoggerService } from "./logger.ts";
import type { BotConfig, BotPool } from "./types.ts";

/**
 * Main entry point for the Solana Arbitrage Bot
 */
async function main(): Promise<void> {
  try {
    // ========================================================================
    // STEP 1: Load Configuration
    // ========================================================================
    LoggerService.info("=".repeat(80));
    LoggerService.info("🚀 Solana Arbitrage Bot - Initializing");
    LoggerService.info("=".repeat(80));

    const config = ConfigManager.loadFromEnv();

    // Validate configuration
    const validation = ConfigManager.validate(config);
    if (!validation.valid) {
      LoggerService.error("Configuration validation failed", validation.errors);
      Deno.exit(1);
    }

    // Initialize logger
    LoggerService.initialize(config.logLevel);

    // ========================================================================
    // STEP 2: Safety Checks
    // ========================================================================
    LoggerService.info("Running safety checks...");

    // Check simulation vs live trading
    if (config.simulationMode) {
      LoggerService.info("✅ SIMULATION MODE ENABLED - No real transactions will be sent");
    } else if (config.enableLiveTrading) {
      LoggerService.warn("🔴 LIVE TRADING ENABLED - Real SOL at stake!");
      LoggerService.warn("Wallet will execute actual swaps on", {
        network: config.network,
        profitThresholdBps: config.minProfitThresholdBps,
      });
    } else {
      LoggerService.warn(
        "⚠️  Live trading disabled but simulation mode also off - bot will run but not execute trades"
      );
    }

    // ========================================================================
    // STEP 3: Load Pools
    // ========================================================================
    LoggerService.info("Loading pools to monitor...");

    // Try to load from env first, then use hardcoded pools
    let poolsToMonitor: BotPool[] = [];
    try {
      poolsToMonitor = parsePoolsFromEnv();
    } catch (error) {
      LoggerService.warn("Could not parse POOLS_JSON from env", {
        error: String(error),
        fallback: "Using default pools",
      });
    }

    // Use hardcoded pools if none specified
    if (poolsToMonitor.length === 0) {
      poolsToMonitor = getDefaultPools(config.network);
    }

    if (poolsToMonitor.length === 0) {
      LoggerService.error("No pools configured to monitor");
      Deno.exit(1);
    }

    LoggerService.info(`Loaded ${poolsToMonitor.length} pools to monitor`, {
      pools: poolsToMonitor.map((p) => ({
        protocol: p.protocol,
        address: p.address.substring(0, 8) + "...",
      })),
    });

    // ========================================================================
    // STEP 4: Initialize Bot (to be implemented)
    // ========================================================================
    LoggerService.info("Initializing bot engine...");

    // The actual bot would be initialized here
    // For now, we'll just log the configuration
    LoggerService.info("Bot configuration:", {
      network: config.network,
      simulationMode: config.simulationMode,
      liveTrading: config.enableLiveTrading,
      minProfitBps: config.minProfitThresholdBps,
      maxSlippageBps: config.maxSlippageBps,
      pollInterval: config.pollIntervalMs,
    });

    // ========================================================================
    // STEP 5: Display Ready Message
    // ========================================================================
    LoggerService.success("✅ Bot Ready", {
      network: config.network,
      mode: config.simulationMode ? "SIMULATION" : "LIVE",
      poolsMonitored: poolsToMonitor.length,
      minProfitBps: config.minProfitThresholdBps,
    });

    LoggerService.info(
      "Bot is ready to start monitoring for arbitrage opportunities."
    );
    LoggerService.info(
      "Press Ctrl+C to stop."
    );

    // ========================================================================
    // STEP 6: Signal Handlers
    // ========================================================================
    Deno.addSignalListener("SIGINT", () => {
      LoggerService.info("Received SIGINT - shutting down gracefully");
      Deno.exit(0);
    });

    Deno.addSignalListener("SIGTERM", () => {
      LoggerService.info("Received SIGTERM - shutting down gracefully");
      Deno.exit(0);
    });

    // ========================================================================
    // STEP 7: Bot Main Loop (placeholder)
    // ========================================================================
    LoggerService.info("Starting bot main loop...");

    // Keep process alive
    await new Promise(() => {
      // Never resolve - process runs until signaled to stop
    });
  } catch (error) {
    LoggerService.error("Fatal error during initialization", error);
    Deno.exit(1);
  }
}

/**
 * Get default pools for a network
 */
function getDefaultPools(network: string): BotPool[] {
  if (network === "devnet") {
    return [
      // Add devnet pools here
    ];
  }

  // Mainnet default pools
  return [
    {
      address: "8qDfsGbREQvzGB7XdrN3xmRyQq33EnGaQvmjT9TSqxU",
      protocol: "raydium",
      tokenA: "So11111111111111111111111111111111111111112", // SOL
      tokenB: "EPjFWaLb3odcccccccccccccccccccccccccccccc", // USDC
      decimalsA: 9,
      decimalsB: 6,
    },
    {
      address: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1jolooT",
      protocol: "orca",
      tokenA: "So11111111111111111111111111111111111111112", // SOL
      tokenB: "EPjFWaLb3odcccccccccccccccccccccccccccccc", // USDC
      decimalsA: 9,
      decimalsB: 6,
    },
  ];
}

// Entry point
if (import.meta.main) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    Deno.exit(1);
  });
}

export { main };
