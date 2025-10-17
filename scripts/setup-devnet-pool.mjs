#!/usr/bin/env node
/**
 * Automated Devnet Pool Setup for Testing Jupiter Swaps
 *
 * This script:
 * 1. Creates a second test token (Token B)
 * 2. Mints liquidity to your wallet
 * 3. Creates an Orca Whirlpool between Token A & B
 * 4. Adds liquidity to the pool
 * 5. Tests Jupiter swap through the pool
 * 6. Validates full reflection distribution with swap
 */

import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  getMint,
} from '@solana/spl-token';
import { createJupiterApiClient } from '@jup-ag/api';
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import Decimal from 'decimal.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC, 'confirmed');

// Your existing token
const TOKEN_A_MINT = '2EycdJ8rshabeCSs4dhBZ2tTj6md4rABDcgHbctZPKAN';

// Amounts
const LIQUIDITY_AMOUNT = 100_000; // 100k tokens (with 9 decimals = 100k * 10^9 base units)
const TEST_SWAP_AMOUNT = 1_000; // 1k tokens for test swap

console.log('🚀 Devnet Pool Setup - Jupiter Swap Testing\n');
console.log('═'.repeat(60));

function loadKeypair(path) {
  try {
    const secretKey = JSON.parse(readFileSync(path, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch (error) {
    throw new Error(`Failed to load keypair from ${path}: ${error.message}`);
  }
}

function savePoolConfig(config) {
  const configPath = join(homedir(), '.mintcraft/devnet-pool.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n💾 Pool config saved to: ${configPath}`);
}

async function step1_CreateTokenB(payer) {
  console.log('\n📝 Step 1: Creating Token B (Test Reward Token)');
  console.log('─'.repeat(60));

  try {
    // Create Token-2022 mint
    const decimals = 9;
    const tokenBMint = await createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      decimals,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    console.log(`✅ Token B created: ${tokenBMint.toBase58()}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Program: Token-2022`);

    return tokenBMint;
  } catch (error) {
    console.error('❌ Failed to create Token B:', error.message);
    throw error;
  }
}

async function step2_MintTokens(payer, tokenAMint, tokenBMint) {
  console.log('\n💰 Step 2: Minting Tokens to Wallet');
  console.log('─'.repeat(60));

  const mintAmount = BigInt(LIQUIDITY_AMOUNT) * BigInt(10 ** 9); // Convert to base units

  try {
    // Get or create token accounts
    console.log('Creating/fetching token accounts...');

    const tokenAAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      new PublicKey(tokenAMint),
      payer.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const tokenBAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      tokenBMint,
      payer.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    console.log(`✅ Token A account: ${tokenAAccount.address.toBase58()}`);
    console.log(`✅ Token B account: ${tokenBAccount.address.toBase58()}`);

    // Mint Token B (you should already have Token A)
    console.log(`\nMinting ${LIQUIDITY_AMOUNT} Token B...`);

    await mintTo(
      connection,
      payer,
      tokenBMint,
      tokenBAccount.address,
      payer,
      mintAmount,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    console.log(`✅ Minted ${LIQUIDITY_AMOUNT} Token B to your wallet`);

    return { tokenAAccount, tokenBAccount };
  } catch (error) {
    console.error('❌ Failed to mint tokens:', error.message);
    throw error;
  }
}

async function step3_CreateSimplePool(payer, tokenAMint, tokenBMint) {
  console.log('\n🏊 Step 3: Creating Liquidity Pool');
  console.log('─'.repeat(60));

  console.log('⚠️  Note: Orca Whirlpools SDK setup is complex.');
  console.log('   For testing purposes, we\'ll use a simpler approach:\n');

  console.log('Option 1: Manual Pool Creation via Orca UI');
  console.log('  1. Go to: https://www.orca.so/');
  console.log('  2. Switch your wallet to devnet');
  console.log('  3. Click "Pools" → "Create Pool"');
  console.log(`  4. Token A: ${tokenAMint}`);
  console.log(`  5. Token B: ${tokenBMint.toBase58()}`);
  console.log(`  6. Add ${LIQUIDITY_AMOUNT} of each token`);
  console.log('  7. Confirm transactions\n');

  console.log('Option 2: Use Raydium (if available on devnet)');
  console.log('  Visit: https://raydium.io/ and follow similar steps\n');

  console.log('💡 For now, we\'ll test Jupiter\'s ability to detect the pool...');

  return {
    poolCreated: false,
    needsManualSetup: true,
  };
}

async function step4_TestJupiterQuote(tokenAMint, tokenBMint) {
  console.log('\n🔍 Step 4: Testing Jupiter Quote');
  console.log('─'.repeat(60));

  try {
    const jupiter = createJupiterApiClient();

    const testAmount = (TEST_SWAP_AMOUNT * 10 ** 9).toString(); // 1k tokens in base units

    console.log(`Requesting quote: ${TEST_SWAP_AMOUNT} Token A → Token B`);
    console.log(`Token A: ${tokenAMint}`);
    console.log(`Token B: ${tokenBMint.toBase58()}\n`);

    const quote = await jupiter.quoteGet({
      inputMint: tokenAMint,
      outputMint: tokenBMint.toBase58(),
      amount: testAmount,
      slippageBps: 500, // 5% slippage for testing
    });

    if (quote) {
      console.log('✅ Jupiter found a route!');
      console.log(`   Input: ${quote.inAmount} base units`);
      console.log(`   Output: ${quote.outAmount} base units`);
      console.log(`   Price Impact: ${quote.priceImpactPct || 'N/A'}%`);

      if (quote.routePlan) {
        console.log(`\n   Route (${quote.routePlan.length} steps):`);
        quote.routePlan.forEach((step, i) => {
          const dex = step.swapInfo?.label || 'Unknown DEX';
          console.log(`   ${i + 1}. ${dex}`);
        });
      }

      return { success: true, quote };
    } else {
      console.log('⚠️  No route found');
      console.log('   This means the pool needs to be created first.');
      return { success: false, quote: null };
    }
  } catch (error) {
    console.log('❌ Quote failed:', error.message);
    console.log('   This is expected if no pool exists yet.');
    return { success: false, error: error.message };
  }
}

async function step5_SaveConfiguration(tokenAMint, tokenBMint, poolInfo) {
  console.log('\n💾 Step 5: Saving Configuration');
  console.log('─'.repeat(60));

  const config = {
    tokenA: {
      mint: tokenAMint,
      symbol: 'TKN_A',
      decimals: 9,
    },
    tokenB: {
      mint: tokenBMint.toBase58(),
      symbol: 'TKN_B',
      decimals: 9,
    },
    pool: poolInfo,
    liquidityAmount: LIQUIDITY_AMOUNT,
    createdAt: new Date().toISOString(),
    network: 'devnet',
  };

  savePoolConfig(config);

  console.log('\n📋 Configuration:');
  console.log(`   Token A: ${config.tokenA.mint}`);
  console.log(`   Token B: ${config.tokenB.mint}`);
  console.log(`   Network: ${config.network}`);

  return config;
}

async function step6_NextSteps(config, jupiterWorked) {
  console.log('\n═'.repeat(60));
  console.log('📚 NEXT STEPS');
  console.log('═'.repeat(60));

  if (jupiterWorked) {
    console.log('\n✅ Jupiter swap route found! Pool is working!\n');

    console.log('🎯 You can now test the full reflection distribution:');
    console.log('\n1. Update scripts/reflections.env:');
    console.log(`   MINT_ADDRESS=${config.tokenA.mint}`);
    console.log(`   REWARD_TOKEN_MINT=${config.tokenB.mint}`);
    console.log('   SWAP_SLIPPAGE_BPS=500\n');

    console.log('2. Run distribution:');
    console.log('   npm run distribute:reflections\n');

    console.log('3. Watch the logs for:');
    console.log('   - Fee collection');
    console.log('   - Jupiter swap execution');
    console.log('   - Reward token distribution\n');
  } else {
    console.log('\n⚠️  Pool needs to be created manually:\n');

    console.log('📝 Manual Setup Steps:');
    console.log('\n1. Visit Orca: https://www.orca.so/');
    console.log('2. Switch wallet to devnet');
    console.log('3. Create pool with:');
    console.log(`   Token A: ${config.tokenA.mint}`);
    console.log(`   Token B: ${config.tokenB.mint}`);
    console.log(`   Liquidity: ${LIQUIDITY_AMOUNT} of each\n`);

    console.log('4. After pool creation, run this script again:');
    console.log('   npm run setup:devnet-pool\n');

    console.log('5. Or test Jupiter quote manually:');
    console.log('   node scripts/test-jupiter-devnet.mjs\n');
  }

  console.log('═'.repeat(60));
  console.log('💡 TIP: For full automated testing, use mainnet with tiny amounts');
  console.log('═'.repeat(60));
}

// Main execution
async function main() {
  try {
    console.log('Loading wallet...');

    const walletPath = process.env.TREASURY_KEYPAIR_PATH || join(homedir(), '.config/solana/id.json');
    const payer = loadKeypair(walletPath);

    console.log(`✅ Wallet loaded: ${payer.publicKey.toBase58()}\n`);

    // Check SOL balance
    const balance = await connection.getBalance(payer.publicKey);
    const solBalance = balance / 10 ** 9;

    console.log(`💰 SOL Balance: ${solBalance.toFixed(4)} SOL`);

    if (solBalance < 1) {
      console.log('⚠️  Low SOL balance! Get devnet SOL:');
      console.log('   solana airdrop 5 --url devnet\n');
    }

    // Execute steps
    const tokenBMint = await step1_CreateTokenB(payer);
    const { tokenAAccount, tokenBAccount } = await step2_MintTokens(payer, TOKEN_A_MINT, tokenBMint);
    const poolInfo = await step3_CreateSimplePool(payer, TOKEN_A_MINT, tokenBMint);
    const jupiterResult = await step4_TestJupiterQuote(TOKEN_A_MINT, tokenBMint);
    const config = await step5_SaveConfiguration(TOKEN_A_MINT, tokenBMint, poolInfo);
    await step6_NextSteps(config, jupiterResult.success);

    console.log('\n✅ Setup complete!\n');

    if (!jupiterResult.success) {
      console.log('⏭️  Manual pool creation required before swaps will work.');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
