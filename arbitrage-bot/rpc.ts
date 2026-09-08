// ============================================================================
// Solana Arbitrage Bot - RPC Manager with Retry Logic
// ============================================================================

import {
  Connection,
  Commitment,
  RpcResponseAndContext,
  SignatureResult,
  BlockheightBasedTransactionConfirmationStrategy,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "https://esm.sh/v135/@solana/web3.js@1.95.0";
import { LoggerService } from "./logger.ts";

export interface RpcManagerConfig {
  rpcUrl: string;
  wsUrl?: string;
  timeout: number;
  retries: number;
  backoffMs: number;
  commitment: Commitment;
}

/**
 * RPC Manager - Manages Solana RPC connections with retry logic
 * - Connection pooling and reuse
 * - Automatic retry with exponential backoff
 * - Timeout handling
 * - Error classification and recovery
 */
export class RpcManager {
  private connection: Connection;
  private config: RpcManagerConfig;
  private lastBlockhash: { hash: string; lastValidBlockHeight: number } | null = null;
  private lastBlockhashTime: number = 0;

  constructor(config: RpcManagerConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, config.commitment);
    LoggerService.info("RPC Manager initialized", {
      url: config.rpcUrl,
      timeout: config.timeout,
      retries: config.retries,
    });
  }

  /**
   * Get connection (reused instance)
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get latest blockhash with caching
   */
  async getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    try {
      // Cache blockhash for 3 seconds to reduce RPC calls
      const now = Date.now();
      if (
        this.lastBlockhash &&
        now - this.lastBlockhashTime < 3000
      ) {
        return {
          blockhash: this.lastBlockhash.hash,
          lastValidBlockHeight: this.lastBlockhash.lastValidBlockHeight,
        };
      }

      const result = await this.withRetry(async () => {
        return await this.connection.getLatestBlockhash(this.config.commitment);
      });

      this.lastBlockhash = {
        hash: result.blockhash,
        lastValidBlockHeight: result.lastValidBlockHeight,
      };
      this.lastBlockhashTime = now;

      return {
        blockhash: result.blockhash,
        lastValidBlockHeight: result.lastValidBlockHeight,
      };
    } catch (error) {
      LoggerService.error("Failed to get latest blockhash", error);
      throw new Error("Unable to fetch blockhash from RPC");
    }
  }

  /**
   * Send transaction with retry logic
   */
  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    signers: Keypair[]
  ): Promise<string> {
    try {
      const signature = await this.withRetry(async () => {
        return await this.connection.sendTransaction(transaction, signers, {
          skipPreflight: false,
          maxRetries: 0,
        });
      });

      LoggerService.info("Transaction sent successfully", { signature });
      return signature;
    } catch (error) {
      LoggerService.error("Failed to send transaction", error);
      throw error;
    }
  }

  /**
   * Confirm transaction with timeout
   */
  async confirmTransaction(
    signature: string,
    maxRetries: number = 60
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current blockhash for confirmation strategy
      const { blockhash, lastValidBlockHeight } = await this.getLatestBlockhash();

      const confirmationStrategy: BlockheightBasedTransactionConfirmationStrategy = {
        blockhash,
        lastValidBlockHeight,
        signature,
      };

      for (let i = 0; i < maxRetries; i++) {
        const status = await this.connection.getSignatureStatus(signature);

        if (status.value?.confirmationStatus === "confirmed" || 
            status.value?.confirmationStatus === "finalized") {
          LoggerService.success("Transaction confirmed", {
            signature,
            status: status.value.confirmationStatus,
          });
          return { success: true };
        }

        if (status.value?.err) {
          const error = status.value.err;
          LoggerService.error("Transaction failed", { signature, error });
          return {
            success: false,
            error: JSON.stringify(error),
          };
        }

        // Wait before retrying
        await this.delay(1000);
      }

      return {
        success: false,
        error: "Transaction confirmation timeout",
      };
    } catch (error) {
      LoggerService.error("Confirmation check failed", error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Get account info with retry
   */
  async getAccountInfo(address: PublicKey) {
    return await this.withRetry(async () => {
      return await this.connection.getAccountInfo(address);
    });
  }

  /**
   * Get balance with retry
   */
  async getBalance(address: PublicKey): Promise<number> {
    return await this.withRetry(async () => {
      return await this.connection.getBalance(address);
    });
  }

  /**
   * Get token balance with retry
   */
  async getTokenBalance(tokenAccount: PublicKey) {
    return await this.withRetry(async () => {
      return await this.connection.getTokenAccountBalance(tokenAccount);
    });
  }

  /**
   * Simulate transaction
   */
  async simulateTransaction(
    transaction: Transaction | VersionedTransaction,
    signers?: Keypair[]
  ) {
    return await this.withRetry(async () => {
      return await this.connection.simulateTransaction(transaction, signers);
    });
  }

  /**
   * Generic retry wrapper with exponential backoff
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      // Add timeout wrapper
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error("RPC request timeout")),
            this.config.timeout
          )
        ),
      ]);
    } catch (error) {
      const isLastAttempt = attempt >= this.config.retries - 1;
      const errorStr = String(error);

      // Classify error
      const isRecoverable =
        errorStr.includes("timeout") ||
        errorStr.includes("429") ||
        errorStr.includes("503") ||
        errorStr.includes("socket");

      if (isLastAttempt || !isRecoverable) {
        LoggerService.error(`RPC call failed after ${attempt + 1} attempts`, error);
        throw error;
      }

      // Exponential backoff
      const delayMs = this.config.backoffMs * Math.pow(2, attempt);
      LoggerService.warn(`RPC call failed, retrying in ${delayMs}ms`, {
        attempt: attempt + 1,
        maxRetries: this.config.retries,
      });

      await this.delay(delayMs);
      return this.withRetry(fn, attempt + 1);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
