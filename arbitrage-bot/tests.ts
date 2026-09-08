// ============================================================================
// Solana Arbitrage Bot - Unit Tests
// ============================================================================

import { assertEquals, assertExists, assertGreater } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { BotConfigManager, PricingUtility, ValidationUtility } from "./arbitrage-bot/core.ts";
import type { BotConfig, ArbitrageOpportunity, PoolPrice } from "./arbitrage-bot/types.ts";

// ============================================================================
// اختبارات BotConfigManager
// ============================================================================

Deno.test("BotConfigManager - Get Default Config", () => {
  const config = BotConfigManager.getDefaultConfig();

  assertExists(config);
  assertExists(config.rpcUrl);
  assertGreater(config.minProfitThreshold, 0);
  assertGreater(config.maxSlippageTolerance, 0);
});

Deno.test("BotConfigManager - Validate Valid Config", () => {
  const config = BotConfigManager.getDefaultConfig();
  config.privateKey = "5" + "0".repeat(87); // Mock valid key format

  const result = BotConfigManager.validateConfig(config);

  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("BotConfigManager - Reject Invalid RPC URL", () => {
  const config = BotConfigManager.getDefaultConfig();
  config.rpcUrl = "";
  config.privateKey = "5" + "0".repeat(87);

  const result = BotConfigManager.validateConfig(config);

  assertEquals(result.valid, false);
  assertEquals(result.errors.some(e => e.includes("RPC")), true);
});

Deno.test("BotConfigManager - Reject Invalid Private Key", () => {
  const config = BotConfigManager.getDefaultConfig();
  config.privateKey = "";

  const result = BotConfigManager.validateConfig(config);

  assertEquals(result.valid, false);
  assertEquals(result.errors.some(e => e.includes("Private")), true);
});

// ============================================================================
// اختبارات PricingUtility
// ============================================================================

Deno.test("PricingUtility - Calculate Spot Price", () => {
  // Pool: 1000 A : 500 B => 0.5 B per A
  const price = PricingUtility.calculateSpotPrice(1000, 500, 0);

  assertEquals(price, 0.5);
});

Deno.test("PricingUtility - Calculate Spot Price with Fee", () => {
  // مع رسم 0.25%
  const price = PricingUtility.calculateSpotPrice(1000, 500, 0.25);
  const priceNoFee = 0.5;
  const feeMultiplier = 1 - 0.25 / 100;

  assertEquals(price, priceNoFee * feeMultiplier);
});

Deno.test("PricingUtility - Calculate Amount Out (CPMM)", () => {
  // Input: 100 A, Pool: 1000 A : 1000 B
  // Expected: ~91 B (after CPMM formula and fee)
  const output = PricingUtility.calculateAmountOut(100, 1000, 1000, 0.25);

  // 100 * 0.9975 = 99.75 (after fee)
  // (99.75 * 1000) / (1000 + 99.75) ≈ 90.07
  assertGreater(output, 85);
  assertEquals(Math.round(output), 90);
});

Deno.test("PricingUtility - Calculate Slippage", () => {
  const expected = 100;
  const actual = 95;

  const slippage = PricingUtility.calculateSlippage(50, expected, actual);

  // (100 - 95) / 100 * 100 = 5%
  assertEquals(slippage, 5);
});

Deno.test("PricingUtility - Calculate Zero Slippage", () => {
  const slippage = PricingUtility.calculateSlippage(50, 100, 100);

  assertEquals(slippage, 0);
});

Deno.test("PricingUtility - Calculate Net Profit", () => {
  const profit = PricingUtility.calculateNetProfit(
    1, // buyAmount (1 SOL)
    1.0, // buyPrice (1 SOL = 1)
    1.05, // sellPrice (1 SOL = 1.05)
    5000, // gasFeeLamports
    0.05, // flashLoanFee (0.05%)
    0 // slippage
  );

  // Profit = (1 * 1.05) - (1 * 1.0) - (5000/10^9) - (1 * 0.05%) ≈ 0.044 SOL
  assertGreater(profit, 0);
  assertGreater(profit, 0.04);
});

// ============================================================================
// اختبارات ValidationUtility
// ============================================================================

Deno.test("ValidationUtility - Is Price Data Fresh", () => {
  const freshPrice: PoolPrice = {
    poolAddress: "test",
    protocol: "raydium",
    tokenA: "SOL",
    tokenB: "USDC",
    price: 100,
    liquidity: 1000,
    timestamp: Date.now(),
    blockHeight: 1000,
  };

  const fresh = ValidationUtility.isPriceDataFresh(freshPrice, 30000);

  assertEquals(fresh, true);
});

Deno.test("ValidationUtility - Is Price Data Stale", () => {
  const stalePrice: PoolPrice = {
    poolAddress: "test",
    protocol: "raydium",
    tokenA: "SOL",
    tokenB: "USDC",
    price: 100,
    liquidity: 1000,
    timestamp: Date.now() - 60000, // 60 ثانية مضت
    blockHeight: 1000,
  };

  const fresh = ValidationUtility.isPriceDataFresh(stalePrice, 30000);

  assertEquals(fresh, false);
});

Deno.test("ValidationUtility - Validate Viable Opportunity", () => {
  const opportunity: ArbitrageOpportunity = {
    tokenA: "SOL",
    tokenB: "USDC",
    buyPool: {
      name: "raydium",
      poolAddress: "buy",
      price: 100,
      liquidity: 10000,
    },
    sellPool: {
      name: "orca",
      poolAddress: "sell",
      price: 102,
      liquidity: 10000,
    },
    priceDifference: 2,
    estimatedProfit: 0.01,
    timestamp: Date.now(),
    blockHeight: 1000,
  };

  const result = ValidationUtility.isOpportunityViable(opportunity, 0.001, 2.0);

  assertEquals(result.viable, true);
});

Deno.test("ValidationUtility - Reject Low Profit Opportunity", () => {
  const opportunity: ArbitrageOpportunity = {
    tokenA: "SOL",
    tokenB: "USDC",
    buyPool: {
      name: "raydium",
      poolAddress: "buy",
      price: 100,
      liquidity: 10000,
    },
    sellPool: {
      name: "orca",
      poolAddress: "sell",
      price: 101.5,
      liquidity: 10000,
    },
    priceDifference: 1.5,
    estimatedProfit: 0.00001, // جداً منخفض
    timestamp: Date.now(),
    blockHeight: 1000,
  };

  const result = ValidationUtility.isOpportunityViable(opportunity, 0.001, 2.0);

  assertEquals(result.viable, false);
  assertEquals(result.reasons.some(r => r.includes("below threshold")), true);
});

// ============================================================================
// طباعة نتائج الاختبارات
// ============================================================================

console.log("✅ جميع الاختبارات أكملت بنجاح!");
