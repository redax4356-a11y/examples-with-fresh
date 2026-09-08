// ============================================================================
// Solana Arbitrage Bot - Unified Logger Service
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

/**
 * Unified LoggerService - used across entire arbitrage bot
 * Ensures consistent logging, no secrets leakage, proper timestamp formatting
 */
export class LoggerService {
  private static currentLevel: LogLevel = "info";
  private static levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    success: 1,
  };

  /**
   * Initialize logger with desired log level
   */
  static initialize(level: LogLevel = "info"): void {
    LoggerService.currentLevel = level;
  }

  /**
   * Get current log level
   */
  static getLevel(): LogLevel {
    return LoggerService.currentLevel;
  }

  /**
   * Log debug message (only if DEBUG mode enabled)
   */
  static debug(message: string, data?: unknown): void {
    if (LoggerService.levels["debug"] >= LoggerService.levels[LoggerService.currentLevel]) {
      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] 🔍 DEBUG: ${message}`,
        data ? JSON.stringify(LoggerService.sanitizeData(data), null, 2) : ""
      );
    }
  }

  /**
   * Log info message
   */
  static info(message: string, data?: unknown): void {
    if (LoggerService.levels["info"] >= LoggerService.levels[LoggerService.currentLevel]) {
      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] ℹ️  INFO: ${message}`,
        data ? JSON.stringify(LoggerService.sanitizeData(data), null, 2) : ""
      );
    }
  }

  /**
   * Log warning message
   */
  static warn(message: string, data?: unknown): void {
    if (LoggerService.levels["warn"] >= LoggerService.levels[LoggerService.currentLevel]) {
      const timestamp = new Date().toISOString();
      console.warn(
        `[${timestamp}] ⚠️  WARN: ${message}`,
        data ? JSON.stringify(LoggerService.sanitizeData(data), null, 2) : ""
      );
    }
  }

  /**
   * Log error message
   */
  static error(message: string, error?: unknown): void {
    if (LoggerService.levels["error"] >= LoggerService.levels[LoggerService.currentLevel]) {
      const timestamp = new Date().toISOString();
      const errorStr = error instanceof Error ? error.message : String(error);
      console.error(
        `[${timestamp}] ❌ ERROR: ${message}`,
        errorStr ? JSON.stringify(LoggerService.sanitizeData({ error: errorStr }), null, 2) : ""
      );
    }
  }

  /**
   * Log success message
   */
  static success(message: string, data?: unknown): void {
    if (LoggerService.levels["success"] >= LoggerService.levels[LoggerService.currentLevel]) {
      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] ✅ SUCCESS: ${message}`,
        data ? JSON.stringify(LoggerService.sanitizeData(data), null, 2) : ""
      );
    }
  }

  /**
   * Sanitize data to prevent logging secrets
   * Never log: privateKey, secret, password, etc.
   */
  private static sanitizeData(data: unknown): unknown {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => LoggerService.sanitizeData(item));
    }

    const obj = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Redact sensitive keys
      if (
        lowerKey.includes("privatekey") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("password") ||
        lowerKey.includes("seed") ||
        lowerKey.includes("mnemonic") ||
        lowerKey.includes("keypair")
      ) {
        sanitized[key] = "***REDACTED***";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = LoggerService.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
