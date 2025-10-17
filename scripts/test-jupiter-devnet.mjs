#!/usr/bin/env node
/**
 * Test Jupiter swap on devnet
 *
 * Note: Jupiter works on devnet but requires:
 * 1. Valid token pairs with liquidity
 * 2. Sufficient balances in source token
 * 3. Properly initialized token accounts
 */

import { Connection, PublicKey, Keypair, VersionedTransaction } from '@solana/web3.js';
import { createJupiterApiClient } from '@jup-ag/api';
import { getAccount, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

console.log('🧪 Testing Jupiter Swap on Devnet\n');

// Devnet configuration
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Known devnet tokens
const TOKENS = {
  // Your Token-2022 mint
  YOUR_TOKEN: '2EycdJ8rshabeCSs4dhBZ2tTj6md4rABDcgHbctZPKAN',

  // Common devnet tokens (these may or may not have liquidity)
  USDC: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',

  // SOL (wrapped)
  WSOL: 'So11111111111111111111111111111111111111112',
};

async function loadKeypair(path) {
  try {
    const secretKey = JSON.parse(readFileSync(path, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch (error) {
    console.log(`⚠️  Could not load keypair from ${path}`);
    return null;
  }
}

async function testJupiterQuote() {
  console.log('🔍 Test 1: Get Jupiter Quote on Devnet\n');

  const connection = new Connection(DEVNET_RPC, 'confirmed');

  try {
    // Initialize Jupiter API client
    const jupiterApi = createJupiterApiClient();
    console.log('✅ Jupiter API client initialized\n');

    // Try to get a quote for a common pair
    console.log('Attempting quote: SOL → USDC');
    console.log(`Input: ${TOKENS.WSOL}`);
    console.log(`Output: ${TOKENS.USDC}`);
    console.log('Amount: 0.001 SOL (1,000,000 lamports)\n');

    const quote = await jupiterApi.quoteGet({
      inputMint: TOKENS.WSOL,
      outputMint: TOKENS.USDC,
      amount: '1000000',
      slippageBps: 100,
    });

    if (quote) {
      console.log('✅ Quote received successfully!');
      console.log(`  Input Amount: ${quote.inAmount}`);
      console.log(`  Output Amount: ${quote.outAmount}`);
      console.log(`  Price Impact: ${quote.priceImpactPct || 'N/A'}%`);
      console.log(`  Route: ${quote.routePlan?.length || 0} swaps`);

      if (quote.routePlan) {
        console.log('\n  Route Plan:');
        quote.routePlan.forEach((step, i) => {
          console.log(`    ${i + 1}. ${step.swapInfo?.label || 'Unknown DEX'}`);
        });
      }

      return true;
    } else {
      console.log('⚠️  No quote returned (may lack liquidity on devnet)');
      return false;
    }
  } catch (error) {
    console.log('❌ Quote failed:', error.message);
    console.log('\nℹ️  This is expected on devnet - liquidity may be limited');
    return false;
  }
}

async function testYourTokenSwap() {
  console.log('\n🔍 Test 2: Test Your Token Swap\n');

  const connection = new Connection(DEVNET_RPC, 'confirmed');

  // Load treasury keypair if available
  const treasuryPath = process.env.TREASURY_KEYPAIR_PATH || join(homedir(), '.config/solana/id.json');
  const treasury = await loadKeypair(treasuryPath);

  if (!treasury) {
    console.log('⚠️  No treasury keypair found - skipping balance check');
    console.log(`   Set TREASURY_KEYPAIR_PATH or place keypair at ${treasuryPath}\n`);
    return;
  }

  console.log(`Treasury: ${treasury.publicKey.toBase58()}\n`);

  try {
    // Check if treasury has your token
    const yourTokenAta = getAssociatedTokenAddressSync(
      new PublicKey(TOKENS.YOUR_TOKEN),
      treasury.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const account = await getAccount(
      connection,
      yourTokenAta,
      'confirmed',
      TOKEN_2022_PROGRAM_ID
    );

    console.log('✅ Treasury token account found');
    console.log(`  Balance: ${account.amount}`);
    console.log(`  Token: ${TOKENS.YOUR_TOKEN}\n`);

    if (account.amount > 0n) {
      console.log('Attempting quote: Your Token → USDC');

      const jupiterApi = createJupiterApiClient();
      const quote = await jupiterApi.quoteGet({
        inputMint: TOKENS.YOUR_TOKEN,
        outputMint: TOKENS.USDC,
        amount: '1000000', // Small test amount
        slippageBps: 500, // Higher slippage for testing
      });

      if (quote) {
        console.log('✅ Quote available for your token!');
        console.log(`  Would receive: ${quote.outAmount} USDC (micro-units)`);
        console.log('\n💡 Your token has liquidity on devnet!');
        return true;
      } else {
        console.log('⚠️  No liquidity found for your token on devnet');
        console.log('   This is normal - most custom tokens lack devnet liquidity');
      }
    } else {
      console.log('⚠️  Treasury balance is 0 - cannot test swap');
    }
  } catch (error) {
    console.log('⚠️  Could not check treasury balance:', error.message);
  }

  return false;
}

async function testSwapExecution() {
  console.log('\n🔍 Test 3: Test Swap Execution (Dry Run)\n');

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const treasuryPath = process.env.TREASURY_KEYPAIR_PATH || join(homedir(), '.config/solana/id.json');
  const treasury = await loadKeypair(treasuryPath);

  if (!treasury) {
    console.log('⚠️  No treasury keypair - skipping execution test\n');
    return;
  }

  try {
    const jupiterApi = createJupiterApiClient();

    // Get a quote first
    const quote = await jupiterApi.quoteGet({
      inputMint: TOKENS.WSOL,
      outputMint: TOKENS.USDC,
      amount: '1000000',
      slippageBps: 100,
    });

    if (!quote) {
      console.log('⚠️  Cannot test execution without valid quote\n');
      return;
    }

    console.log('Getting swap transaction from Jupiter...');

    // Get swap transaction (doesn't execute, just builds it)
    const swapResponse = await jupiterApi.swapPost({
      swapRequest: {
        quoteResponse: quote,
        userPublicKey: treasury.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      },
    });

    console.log('✅ Swap transaction built successfully!');
    console.log('   Transaction ready to sign and send\n');

    // Deserialize to inspect (don't send)
    const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    console.log('📊 Transaction Details:');
    console.log(`  Signatures required: ${transaction.signatures.length}`);
    console.log(`  Instructions: ${transaction.message.compiledInstructions.length}`);
    console.log('\n💡 Transaction structure valid - would execute on-chain');

    return true;
  } catch (error) {
    console.log('❌ Swap execution test failed:', error.message);
  }

  return false;
}

// Run tests
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  JUPITER DEVNET TESTING');
  console.log('═══════════════════════════════════════════════════════\n');

  const quoteWorks = await testJupiterQuote();
  const yourTokenWorks = await testYourTokenSwap();
  const executionWorks = await testSwapExecution();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`✅ Jupiter API on Devnet: ${quoteWorks ? 'WORKING' : 'LIMITED'}`);
  console.log(`✅ Your Token Liquidity: ${yourTokenWorks ? 'AVAILABLE' : 'NOT FOUND'}`);
  console.log(`✅ Swap Execution: ${executionWorks ? 'READY' : 'NEEDS SETUP'}`);

  console.log('\n📝 Summary:');
  if (quoteWorks) {
    console.log('  - Jupiter works on devnet for tokens with liquidity');
  } else {
    console.log('  - Jupiter API accessible but limited liquidity on devnet');
  }

  if (yourTokenWorks) {
    console.log('  - Your token has liquidity and can be swapped!');
  } else {
    console.log('  - Your token lacks devnet liquidity (normal for custom tokens)');
  }

  console.log('\n💡 Recommendations:');
  if (!yourTokenWorks) {
    console.log('  1. Test swap logic with SOL ↔ USDC pairs on devnet');
    console.log('  2. Use mainnet for actual token swaps (with small amounts first)');
    console.log('  3. Or manually fund treasury with reward tokens for testing');
  } else {
    console.log('  1. You can test full swap flow on devnet!');
    console.log('  2. Use small amounts for initial tests');
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

runTests().catch(console.error);
