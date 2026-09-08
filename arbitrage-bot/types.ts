// ============================================================================
// Solana Arbitrage Bot - Type Definitions
// ============================================================================

export interface ArbitrageOpportunity {
  tokenA: string; // Mint address
  tokenB: string; // Mint address
  buyPool: {
    name: "raydium" | "orca" | "marinade" | "jupiter";
    poolAddress: string;
    price: number; // Token A to Token B ratio
    liquidity: number; // Available liquidity in Token B
  };
  sellPool: {
    name: "raydium" | "orca" | "marinade" | "jupiter";
    poolAddress: string;
    price: number; // Token A to Token B ratio
    liquidity: number; // Available liquidity in Token B
  };
  priceDifference: number; // Percentage difference: (sellPrice - buyPrice) / buyPrice
  estimatedProfit: number; // Estimated profit in SOL after gas & fees
  timestamp: number;
  blockHeight: number;
  txSignature?: string;
}

export interface FlashLoanConfig {
  amount: number; // Amount to borrow in lamports or token base units
  protocol: "raydium" | "orca" | "jupiter"; // Protocol for flash loan
  feePercentage: number; // Flash loan fee (typically 0.05%)
  repaymentAmount: number; // Amount to repay (loan + fee)
}

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

export interface BotConfig {
  rpcUrl: string;
  wsUrl: string;
  privateKey: string; // Base58 encoded
  minProfitThreshold: number; // Minimum profit in SOL to execute
  maxSlippageTolerance: number; // Maximum slippage % before canceling
  maxGasPrice: number; // Max gas price in lamports
  flashLoanMaxFee: number; // Maximum flash loan fee %
  poolUpdateInterval: number; // How often to fetch pool prices (ms)
  backrunWindowSize: number; // Number of recent blocks to track
  executeOnBlockConfirmation: boolean; // Wait for block confirmation
}

export interface PoolPrice {
  poolAddress: string;
  protocol: string;
  tokenA: string;
  tokenB: string;
  price: number; // A to B ratio
  liquidity: number;
  timestamp: number;
  blockHeight: number;
}

export interface Transaction {
  signature: string;
  slot: number;
  timestamp: number;
  type: "BUY" | "SELL" | "FLASH_LOAN_REPAY";
  profit: number;
  status: "PENDING" | "CONFIRMED" | "FAILED";
}

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
