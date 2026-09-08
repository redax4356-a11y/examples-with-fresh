// ============================================================================
// Solana Arbitrage Bot - Configuration Management & Validation
// ============================================================================

import { PublicKey } from "https://esm.sh/v135/@solana/web3.js@1.95.0";

export interface BotConfig {
  // Network Configuration
  rpcUrl: string;
  wsUrl: string;
  network: "mainnet-beta" | "devnet" | "testnet-beta";

  // Wallet Configuration
  privateKeyFormat: "base58" | "json";
  privateKey: string;

  // Arbitrage Configuration
  minProfitThresholdLamports: bigint; // Net profit in lamports
  minProfitThresholdBps: number; // Basis points (10000 = 100%)
  maxSlippageBps: number; // Basis points
  maxTradeSizeLamports: bigint;
  minPoolLiquidityLamports: bigint;

  // Transaction Configuration
  priorityFeeLamports: bigint;
  computeUnitLimit: number;
  computeUnitPrice: number;
  maxTransactionFeeLamports: bigint;

  // RPC Configuration
  pollIntervalMs: number;
  rpcTimeoutMs: number;
  rpcRetries: number;
  rpcBackoffMs: number;
  confirmationCommitment: "processed" | "confirmed" | "finalized";

  // Safety Configuration
  simulationMode: boolean;
  enableLiveTrading: boolean;
  maxConcurrentTrades: number;
  maxConsecutiveFailures: number;
  failureCooldownMs: number;

  // Logging
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface BotPool {
  address: string;
  protocol: "raydium" | "orca" | "jupiter";
  tokenA: string; // Mint address
  tokenB: string; // Mint address
  decimalsA?: number; // Optional, will be fetched
  decimalsB?: number; // Optional, will be fetched
}

/**
 * Configuration Manager - Loads and validates bot configuration from environment
 */
export class ConfigManager {
  static loadFromEnv(): BotConfig {
    const env = Deno.env.toObject();

    // Safety Checks - These must be set correctly
    const simulationMode = env.SIMULATION_MODE?.toLowerCase() === "true";
    const enableLiveTrading =
      env.ENABLE_LIVE_TRADING?.toLowerCase() === "true";

    // CRITICAL: Require explicit double-opt-in for live trading
    if (enableLiveTrading && !simulationMode) {
      // Check if user is aware of live trading
      if (
        !env.ENABLE_LIVE_TRADING ||
        !env.SOLANA_PRIVATE_KEY ||
        !env.MIN_PROFIT_THRESHOLD_BPS
      ) {
        throw new Error(
          "CRITICAL: Live trading is enabled but required safety checks are missing. " +
            "Set SIMULATION_MODE=false only after reviewing security requirements."
        );
      }
    }

    const config: BotConfig = {
      // Network
      rpcUrl:
        env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
      wsUrl:
        env.SOLANA_WS_URL || "wss://api.mainnet-beta.solana.com",
      network: (env.NETWORK || "mainnet-beta") as any,

      // Wallet
      privateKeyFormat: (env.PRIVATE_KEY_FORMAT || "base58") as any,
      privateKey: env.SOLANA_PRIVATE_KEY || "",

      // Arbitrage Thresholds (use basis points, not percentages)
      minProfitThresholdLamports: BigInt(
        env.MIN_PROFIT_THRESHOLD_LAMPORTS || "1000000"
      ), // 0.001 SOL default
      minProfitThresholdBps: parseInt(env.MIN_PROFIT_THRESHOLD_BPS || "10"), // 0.1% default
      maxSlippageBps: parseInt(env.MAX_SLIPPAGE_BPS || "200"), // 2% default
      maxTradeSizeLamports: BigInt(
        env.MAX_TRADE_SIZE_LAMPORTS || "10000000000"
      ), // 10 SOL default
      minPoolLiquidityLamports: BigInt(
        env.MIN_POOL_LIQUIDITY_LAMPORTS || "100000000"
      ), // 0.1 SOL default

      // Transaction Settings
      priorityFeeLamports: BigInt(env.PRIORITY_FEE_LAMPORTS || "1000"),
      computeUnitLimit: parseInt(env.COMPUTE_UNIT_LIMIT || "200000"),
      computeUnitPrice: parseInt(env.COMPUTE_UNIT_PRICE || "1000"),
      maxTransactionFeeLamports: BigInt(
        env.MAX_TRANSACTION_FEE_LAMPORTS || "1000000"
      ), // 0.001 SOL default

      // RPC
      pollIntervalMs: parseInt(env.POLL_INTERVAL_MS || "5000"),
      rpcTimeoutMs: parseInt(env.RPC_TIMEOUT_MS || "30000"),
      rpcRetries: parseInt(env.RPC_RETRIES || "3"),
      rpcBackoffMs: parseInt(env.RPC_BACKOFF_MS || "1000"),
      confirmationCommitment: (env.CONFIRMATION_COMMITMENT ||
        "confirmed") as any,

      // Safety
      simulationMode,
      enableLiveTrading,
      maxConcurrentTrades: parseInt(env.MAX_CONCURRENT_TRADES || "1"),
      maxConsecutiveFailures: parseInt(env.MAX_CONSECUTIVE_FAILURES || "5"),
      failureCooldownMs: parseInt(env.FAILURE_COOLDOWN_MS || "60000"),

      // Logging
      logLevel: (env.LOG_LEVEL || "info") as any,
    };

    return config;
  }

  static validate(config: BotConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // RPC URL validation
    if (!config.rpcUrl || !config.rpcUrl.startsWith("http")) {
      errors.push("SOLANA_RPC_URL must be a valid HTTP(S) URL");
    }

    // Network validation
    if (!["mainnet-beta", "devnet", "testnet-beta"].includes(config.network)) {
      errors.push(`Invalid network: ${config.network}`);
    }

    // Private key validation
    if (!config.privateKey) {
      errors.push("SOLANA_PRIVATE_KEY is required");
    }

    // Profit threshold validation
    if (config.minProfitThresholdLamports < 0n) {
      errors.push("MIN_PROFIT_THRESHOLD_LAMPORTS must be >= 0");
    }

    if (config.minProfitThresholdBps < 0 || config.minProfitThresholdBps > 10000) {
      errors.push("MIN_PROFIT_THRESHOLD_BPS must be 0-10000");
    }

    // Slippage validation
    if (config.maxSlippageBps < 0 || config.maxSlippageBps > 10000) {
      errors.push("MAX_SLIPPAGE_BPS must be 0-10000");
    }

    // Trade size validation
    if (config.maxTradeSizeLamports <= 0n) {
      errors.push("MAX_TRADE_SIZE_LAMPORTS must be > 0");
    }

    // Interval validation
    if (config.pollIntervalMs < 1000) {
      errors.push("POLL_INTERVAL_MS must be >= 1000ms");
    }

    // Live trading safety checks
    if (config.enableLiveTrading && !config.simulationMode) {
      if (!config.privateKey) {
        errors.push(
          "CRITICAL: Cannot enable live trading without private key"
        );
      }
      // Require lower BPS threshold for safety
      if (config.minProfitThresholdBps < 5) {
        errors.push(
          "CRITICAL: Live trading profit threshold too low (min 5 BPS)"
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Decode private key from Base58 format
   */
  static decodePrivateKey(keyStr: string, format: "base58" | "json"): Uint8Array {
    if (format === "json") {
      // JSON array format: [1,2,3,...]
      try {
        const parsed = JSON.parse(keyStr);
        if (Array.isArray(parsed) && parsed.length === 64) {
          return new Uint8Array(parsed);
        }
        throw new Error("Invalid JSON key format");
      } catch (e) {
        throw new Error(`Failed to parse JSON private key: ${e}`);
      }
    } else {
      // Base58 format
      return this.base58Decode(keyStr);
    }
  }

  /**
   * Base58 Decoder
   */
  private static base58Decode(str: string): Uint8Array {
    const alphabet =
      "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let decoded = 0n;
    let base = 1n;

    for (let i = str.length - 1; i >= 0; i--) {
      const digit = alphabet.indexOf(str[i]);
      if (digit === -1) {
        throw new Error(`Invalid Base58 character: ${str[i]}`);
      }
      decoded += base * BigInt(digit);
      base *= 58n;
    }

    // Convert BigInt to bytes
    const bytes: number[] = [];
    while (decoded > 0n) {
      bytes.unshift(Number(decoded & 0xffn));
      decoded >>= 8n;
    }

    // Pad with zeros if needed
    while (bytes.length < 64) {
      bytes.unshift(0);
    }

    return new Uint8Array(bytes);
  }

  /**
   * Validate pool addresses
   */
  static validatePoolAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Parse pools from environment variable or config file
 */
export function parsePoolsFromEnv(): BotPool[] {
  const poolsEnv = Deno.env.get("POOLS_JSON");
  
  if (!poolsEnv) {
    return [];
  }

  try {
    const pools = JSON.parse(poolsEnv);
    if (!Array.isArray(pools)) {
      throw new Error("POOLS_JSON must be a JSON array");
    }

    // Validate each pool
    return pools.map((pool: unknown) => {
      const p = pool as Record<string, unknown>;
      if (
        !p.address ||
        !p.protocol ||
        !p.tokenA ||
        !p.tokenB
      ) {
        throw new Error("Each pool must have address, protocol, tokenA, tokenB");
      }

      if (!["raydium", "orca", "jupiter"].includes(p.protocol as string)) {
        throw new Error(`Invalid protocol: ${p.protocol}`);
      }

      if (!ConfigManager.validatePoolAddress(p.address as string)) {
        throw new Error(`Invalid pool address: ${p.address}`);
      }

      return {
        address: p.address as string,
        protocol: p.protocol as any,
        tokenA: p.tokenA as string,
        tokenB: p.tokenB as string,
        decimalsA: typeof p.decimalsA === "number" ? p.decimalsA : undefined,
        decimalsB: typeof p.decimalsB === "number" ? p.decimalsB : undefined,
      };
    });
  } catch (error) {
    throw new Error(`Failed to parse POOLS_JSON: ${error}`);
  }
}
