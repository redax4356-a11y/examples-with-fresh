// ============================================================================
// Solana Arbitrage Bot - Unified Type Definitions
// ============================================================================

/**
 * CANONICAL BotConfig - Single source of truth for all configuration
 * Used across entire bot - DO NOT duplicate this definition
 */
export interface BotConfig {
  // Network Configuration
  rpcUrl: string;
  wsUrl: string;
  network: "mainnet-beta" | "devnet" | "testnet-beta";

  // Wallet Configuration
  privateKeyFormat: "base58" | "json";
  privateKey: string;

  // Arbitrage Configuration (use BigInt for precision)
  minProfitThresholdLamports: bigint; // Net profit in lamports (smallest unit)
  minProfitThresholdBps: number; // Basis points (10000 = 100%)
  maxSlippageBps: number; // Basis points (0-10000)
  maxTradeSizeLamports: bigint; // Maximum trade size
  minPoolLiquidityLamports: bigint; // Minimum pool liquidity

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
  simulationMode: boolean; // If true, no transactions sent to blockchain
  enableLiveTrading: boolean; // If true, actually execute trades
  maxConcurrentTrades: number;
  maxConsecutiveFailures: number;
  failureCooldownMs: number;

  // Logging
  logLevel: "debug" | "info" | "warn" | "error";
}

/**
 * Pool Configuration
 */
export interface BotPool {
  address: string; // Pool account address
  protocol: "raydium" | "orca" | "jupiter";
  tokenA: string; // Mint address
  tokenB: string; // Mint address
  decimalsA?: number; // Optional, will be fetched from mint
  decimalsB?: number; // Optional, will be fetched from mint
}

/**
 * Arbitrage Opportunity - represents a detected arbitrage opportunity
 */
export interface ArbitrageOpportunity {
  tokenA: string; // Mint address
  tokenB: string; // Mint address
  buyPool: {
    name: "raydium" | "orca" | "jupiter";
    poolAddress: string;
    price: number; // Token A to Token B ratio
    liquidity: number; // Available liquidity in Token B
  };
  sellPool: {
    name: "raydium" | "orca" | "jupiter";
    poolAddress: string;
    price: number; // Token A to Token B ratio
    liquidity: number; // Available liquidity in Token B
  };
  priceDifference: number; // Percentage difference
  estimatedProfit: number; // Estimated profit in SOL after all fees
  timestamp: number;
  blockHeight: number;
  txSignature?: string;
}

/**
 * Pool Price data from a single market
 */
export interface PoolPrice {
  poolAddress: string;
  protocol: string;
  tokenA: string;
  tokenB: string;
  price: number; // A to B ratio
  liquidity: number;
  timestamp: number; // When this price was fetched
  blockHeight: number;
}

/**
 * Flash Loan Configuration
 */
export interface FlashLoanConfig {
  amount: number; // Amount to borrow in lamports or token base units
  protocol: "raydium" | "orca" | "jupiter"; // Protocol for flash loan
  feePercentage: number; // Flash loan fee (typically 0.05%)
  repaymentAmount: number; // Amount to repay (loan + fee)
}

/**
 * Execution Result - result of arbitrage execution
 */
export interface ExecutionResult {
  success: boolean;
  txSignature?: string;
  profit: number; // Net profit in SOL/token
  gasUsed: number;
  flashLoanFee: number;
  slippage: number; // Actual slippage percentage
  error?: string;
  timestamp: number;
}

/**
 * Transaction record for backrun engine
 */
export interface Transaction {
  signature: string;
  slot: number;
  timestamp: number;
  type: "BUY" | "SELL" | "FLASH_LOAN_REPAY";
  profit: number;
  status: "PENDING" | "CONFIRMED" | "FAILED";
}

/**
 * Backrun metrics and statistics
 */
export interface BackrunMetrics {
  lastBlockHeight: number;
  recentTransactions: Transaction[];
  priceHistory: Map<string, PoolPrice[]>;
  successfulArbitrages: ArbitrageOpportunity[];
  failedAttempts: Array<{
    reason: string;
    timestamp: number;
    opportunity?: ArbitrageOpportunity;
  }>;
}

/**
 * Quote for a swap operation
 */
export interface SwapQuote {
  inputAmount: bigint; // Input amount in base units
  outputAmount: bigint; // Expected output in base units
  priceImpact: number; // Price impact percentage
  fee: bigint; // Fee in base units
  minOutputAmount: bigint; // Minimum output after slippage
  timestamp: number;
  isValid: boolean; // Whether quote is still fresh
}

/**
 * Opportunity validation result
 */
export interface OpportunityValidation {
  viable: boolean;
  reasons: string[];
  profitAfterFees?: number;
}
