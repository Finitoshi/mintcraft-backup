#!/usr/bin/env node
/**
 * Create Orca Whirlpool - Using Modern SDK (v4.0.0)
 *
 * Uses the new @orca-so/whirlpools API with simplified interface:
 * - No manual sqrt price calculations
 * - No manual PDA derivation
 * - Simple price input (e.g., 1.0 for 1:1 ratio)
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  createSplashPool,
  openFullRangePosition,
  setWhirlpoolsConfig,
  setRpc,
  setPayerFromBytes,
} from '@orca-so/whirlpools';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';

// Your tokens
const TOKEN_A = '2EycdJ8rshabeCSs4dhBZ2tTj6md4rABDcgHbctZPKAN';
const TOKEN_B = 'B81MRLfcsTL3s4fDGJhhwiv9425tbTLfoMZ4QBWVEGEm';

// Pool parameters
const INITIAL_PRICE = 1.0; // 1:1 price ratio (Token A priced in Token B)
const LIQUIDITY_A = BigInt(50_000 * 10 ** 9); // 50k tokens (9 decimals)
const LIQUIDITY_B = BigInt(50_000 * 10 ** 9); // 50k tokens (9 decimals)

console.log('🌊 Creating Orca Whirlpool (Modern SDK)\n');
console.log('═'.repeat(60));

function loadKeypair(path) {
  const secretKey = JSON.parse(readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function main() {
  try {
    // Load wallet
    console.log('Loading wallet...');
    const walletPath = process.env.TREASURY_KEYPAIR_PATH || join(homedir(), '.config/solana/id.json');
    const wallet = loadKeypair(walletPath);

    console.log(`✅ Wallet: ${wallet.publicKey.toBase58()}\n`);

    // Setup connection
    const rpc = new Connection(DEVNET_RPC, 'confirmed');

    // Configure SDK for devnet
    console.log('Configuring Orca SDK for devnet...');
    await setRpc(DEVNET_RPC);
    await setPayerFromBytes(wallet.secretKey);
    await setWhirlpoolsConfig('solanaDevnet');
    console.log('✅ SDK configured\n');

    // Convert to PublicKey objects
    const tokenMintA = new PublicKey(TOKEN_A);
    const tokenMintB = new PublicKey(TOKEN_B);

    console.log('📊 Pool Configuration:');
    console.log(`   Token A: ${TOKEN_A}`);
    console.log(`   Token B: ${TOKEN_B}`);
    console.log(`   Initial Price: ${INITIAL_PRICE} (Token A per Token B)`);
    console.log(`   Liquidity A: ${Number(LIQUIDITY_A) / 10 ** 9} tokens`);
    console.log(`   Liquidity B: ${Number(LIQUIDITY_B) / 10 ** 9} tokens\n`);

    // Step 1: Create the pool
    console.log('🏗️  Step 1: Creating Pool...\n');

    const { poolAddress, instructions: createPoolIx, callback: sendCreatePoolTx } = await createSplashPool(
      rpc,
      tokenMintA,  // Use PublicKey object
      tokenMintB,  // Use PublicKey object
      INITIAL_PRICE,
      wallet
    );

    console.log(`   Pool address (derived): ${poolAddress}`);
    console.log(`   Transaction instructions: ${createPoolIx.length}`);

    // Send pool creation transaction
    console.log('\nSending pool creation transaction...');
    const createPoolTxId = await sendCreatePoolTx();
    console.log(`✅ Pool created! Tx: ${createPoolTxId}\n`);

    // Wait for confirmation
    console.log('Waiting for confirmation...');
    await rpc.confirmTransaction(createPoolTxId, 'confirmed');
    console.log('✅ Pool creation confirmed!\n');

    // Step 2: Add liquidity (open full range position)
    console.log('💰 Step 2: Adding Liquidity...\n');

    const { positionMint, instructions: addLiquidityIx, callback: sendAddLiquidityTx } = await openFullRangePosition(
      rpc,
      poolAddress,
      LIQUIDITY_A,
      LIQUIDITY_B,
      wallet
    );

    console.log(`   Position mint: ${positionMint}`);
    console.log(`   Transaction instructions: ${addLiquidityIx.length}`);

    // Send liquidity transaction
    console.log('\nSending add liquidity transaction...');
    const addLiquidityTxId = await sendAddLiquidityTx();
    console.log(`✅ Liquidity added! Tx: ${addLiquidityTxId}`);
    console.log(`   Position NFT: ${positionMint}\n`);

    // Wait for confirmation
    console.log('Waiting for confirmation...');
    await rpc.confirmTransaction(addLiquidityTxId, 'confirmed');
    console.log('✅ Liquidity confirmed!\n');

    // Summary
    console.log('═'.repeat(60));
    console.log('🎉 POOL CREATED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log(`\n📍 Pool Address: ${poolAddress}`);
    console.log(`💧 Position NFT: ${positionMint}`);
    console.log(`💰 Liquidity Added: ${Number(LIQUIDITY_A) / 10 ** 9} Token A + ${Number(LIQUIDITY_B) / 10 ** 9} Token B\n`);

    console.log('✅ Jupiter can now route swaps through this pool!');
    console.log('\n🧪 Test Jupiter Detection:');
    console.log('   npm run setup:devnet-pool\n');

    console.log('📝 Configure Reflections:');
    console.log(`   MINT_ADDRESS=${TOKEN_A}`);
    console.log(`   REWARD_TOKEN_MINT=${TOKEN_B}`);
    console.log('   SWAP_SLIPPAGE_BPS=500\n');

    console.log('🚀 Run Full Distribution:');
    console.log('   npm run distribute:reflections\n');

    console.log('═'.repeat(60));

    return { poolAddress, positionMint };

  } catch (error) {
    console.error('\n❌ Pool creation failed:', error);
    console.error(error.stack);

    console.log('\n💡 Common issues:');
    console.log('   - Insufficient SOL (need ~2-3 SOL for pool + liquidity)');
    console.log('   - Pool already exists (check if it was created before)');
    console.log('   - Token accounts not initialized');
    console.log('   - Network issues (devnet can be slow)\n');

    // Check if it's a "pool already exists" error
    if (error.message && error.message.includes('already in use')) {
      console.log('⚠️  Pool may already exist. Try running:');
      console.log('   npm run setup:devnet-pool\n');
    }

    process.exit(1);
  }
}

main();
