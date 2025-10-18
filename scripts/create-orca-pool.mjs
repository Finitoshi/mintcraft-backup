#!/usr/bin/env node
/**
 * Create Orca Whirlpool on Devnet - Fully Automated
 *
 * This creates a real liquidity pool between two tokens
 * that Jupiter can route swaps through.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import BN from 'bn.js';
import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  PoolUtil,
  PriceMath,
  increaseLiquidityQuoteByInputTokenWithParams,
  TokenExtensionUtil,
} from '@orca-so/whirlpools-sdk';
import { DecimalUtil, Percentage } from '@orca-so/common-sdk';
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import Decimal from 'decimal.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';

// Token configuration (simple tokens without extensions for pool compatibility)
// Note: Swapped order to match canonical ordering (sorted by pubkey bytes)
const TOKEN_A = 'JoEXgCw479WmrmgC9Sg9XYRus5EWgZTyH3Y22XsadoA';
const TOKEN_B = '2QprFJc11wnp2sYp3Psrtoq3BKrxHAnmbgCtJmqnki7b';

// Pool parameters
const TICK_SPACING = 64; // 0.01% fee tier (standard)
const INITIAL_PRICE = 1.0; // 1:1 price ratio
const LIQUIDITY_AMOUNT = new Decimal(50000); // 50k of each token

console.log('🌊 Creating Orca Whirlpool on Devnet\n');
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
    const keypair = loadKeypair(walletPath);
    const wallet = new Wallet(keypair);

    console.log(`✅ Wallet: ${wallet.publicKey.toBase58()}\n`);

    // Setup connection and provider
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());

    // Initialize Whirlpool context
    console.log('Initializing Orca Whirlpool SDK...');
    const ctx = WhirlpoolContext.from(
      connection,
      wallet,
      ORCA_WHIRLPOOL_PROGRAM_ID
    );
    const client = buildWhirlpoolClient(ctx);
    console.log('✅ Whirlpool client initialized\n');

    // Token mints
    const tokenMintA = new PublicKey(TOKEN_A);
    const tokenMintB = new PublicKey(TOKEN_B);

    console.log('📊 Pool Configuration:');
    console.log(`   Token A: ${tokenMintA.toBase58()}`);
    console.log(`   Token B: ${tokenMintB.toBase58()}`);
    console.log(`   Tick Spacing: ${TICK_SPACING}`);
    console.log(`   Initial Price: ${INITIAL_PRICE}`);
    console.log(`   Liquidity: ${LIQUIDITY_AMOUNT.toString()} tokens each\n`);

    // Get whirlpools config (devnet config)
    // Use the known Orca devnet config address
    console.log('Using Orca devnet config...');
    const ORCA_WHIRLPOOL_CONFIG = new PublicKey('FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR'); // Devnet config
    console.log(`✅ Config: ${ORCA_WHIRLPOOL_CONFIG.toBase58()}\n`);

    // Derive pool PDA
    console.log('Deriving pool address...');
    const [poolPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('whirlpool'),
        ORCA_WHIRLPOOL_CONFIG.toBuffer(),
        tokenMintA.toBuffer(),
        tokenMintB.toBuffer(),
        Buffer.from([TICK_SPACING, 0]),
      ],
      ORCA_WHIRLPOOL_PROGRAM_ID
    );
    console.log(`✅ Pool PDA: ${poolPda.toBase58()}\n`);

    // Check if pool already exists
    console.log('Checking if pool exists...');
    const poolAccount = await connection.getAccountInfo(poolPda);
    let poolCreated = false;

    if (poolAccount) {
      console.log('✅ Pool already exists!');
      console.log(`   Address: ${poolPda.toBase58()}\n`);
      poolCreated = true;
    } else {
      console.log('📝 Pool does not exist, creating new pool...\n');
      poolCreated = false;
    }

    if (!poolCreated) {

    // Convert price to tick index (for 1:1 price, tick = 0)
    const initialTick = PriceMath.priceToInitializableTickIndex(
      new Decimal(INITIAL_PRICE),
      9, // Token A decimals
      9, // Token B decimals
      TICK_SPACING
    );

    console.log(`   Initial tick: ${initialTick}\n`);

    // Create pool instruction
    console.log('🏗️  Creating pool...');

    const { poolKey, tx: createPoolTx } = await client.createPool(
      ORCA_WHIRLPOOL_CONFIG,
      tokenMintA,
      tokenMintB,
      TICK_SPACING,
      initialTick,
      wallet.publicKey
    );

    console.log('Sending transaction...');
    const createPoolSignature = await createPoolTx.buildAndExecute();
    console.log(`✅ Pool created! Signature: ${createPoolSignature}\n`);

    // Wait for confirmation
    console.log('Waiting for confirmation...');
    await connection.confirmTransaction(createPoolSignature, 'confirmed');
    console.log('✅ Pool creation confirmed!\n');
    }

    // Get the whirlpool account
    console.log('Loading pool data...');
    const whirlpool = await client.getPool(poolPda);
    console.log('✅ Pool loaded\n');

    console.log('📊 Pool Details:');
    console.log(`   Address: ${poolPda.toBase58()}`);
    const poolData = whirlpool.getData();
    console.log(`   Current Liquidity: ${poolData.liquidity.toString()}\n`);

    // Now add liquidity
    console.log('💰 Adding Liquidity...\n');

    // Get current price
    const currentPrice = PriceMath.sqrtPriceX64ToPrice(
      whirlpool.getData().sqrtPrice,
      9,
      9
    );

    console.log(`   Current price: ${currentPrice.toString()}`);

    // Calculate tick range (full range for simplicity)
    // Ticks must be multiples of tick spacing (64)
    const tickLower = -443584; // -443636 rounded to nearest multiple of 64
    const tickUpper = 443584;  // 443636 rounded to nearest multiple of 64

    console.log(`   Tick range: ${tickLower} to ${tickUpper}`);

    // Calculate liquidity quote
    const inputTokenAmount = new BN(LIQUIDITY_AMOUNT.mul(new Decimal(10).pow(9)).floor().toString());

    const quote = increaseLiquidityQuoteByInputTokenWithParams({
      tokenMintA: tokenMintA,
      tokenMintB: tokenMintB,
      sqrtPrice: whirlpool.getData().sqrtPrice,
      tickCurrentIndex: whirlpool.getData().tickCurrentIndex,
      tickLowerIndex: tickLower,
      tickUpperIndex: tickUpper,
      inputTokenMint: tokenMintA,
      inputTokenAmount: inputTokenAmount,
      slippageTolerance: Percentage.fromFraction(1, 100), // 1% slippage
      tokenExtensionCtx: await TokenExtensionUtil.buildTokenExtensionContext(
        ctx.fetcher,
        whirlpool.getData()
      ),
    });

    console.log(`\n   Token A input: ${new Decimal(quote.tokenMaxA.toString()).div(new Decimal(10).pow(9)).toString()}`);
    console.log(`   Token B input: ${new Decimal(quote.tokenMaxB.toString()).div(new Decimal(10).pow(9)).toString()}\n`);

    // Open position and add liquidity
    console.log('Creating position...');

    const { positionMint, tx: openPositionTx } = await whirlpool.openPosition(
      tickLower,
      tickUpper,
      quote
    );

    console.log('Sending transaction...');
    const positionSignature = await openPositionTx.buildAndExecute();
    console.log(`✅ Position created! Signature: ${positionSignature}`);
    console.log(`   Position NFT: ${positionMint.toBase58()}\n`);

    // Wait for confirmation
    console.log('Waiting for confirmation...');
    await connection.confirmTransaction(positionSignature, 'confirmed');
    console.log('✅ Liquidity added successfully!\n');

    // Refresh pool data
    await whirlpool.refreshData();

    console.log('═'.repeat(60));
    console.log('🎉 POOL WITH LIQUIDITY CREATED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log(`\n📍 Pool Address: ${poolPda.toBase58()}`);
    console.log(`💧 Total Liquidity: ${whirlpool.getData().liquidity.toString()}\n`);

    console.log('✅ Jupiter can now route swaps through this pool!');
    console.log('\n🧪 Test it:');
    console.log('   npm run setup:devnet-pool\n');

    console.log('📝 Configure reflections:');
    console.log(`   MINT_ADDRESS=${TOKEN_A}`);
    console.log(`   REWARD_TOKEN_MINT=${TOKEN_B}`);
    console.log('   SWAP_SLIPPAGE_BPS=500\n');

    console.log('🚀 Run distribution:');
    console.log('   npm run distribute:reflections\n');

    console.log('═'.repeat(60));

    return poolPda;

  } catch (error) {
    console.error('\n❌ Pool creation failed:', error);
    console.error(error.stack);

    console.log('\n💡 Common issues:');
    console.log('   - Insufficient SOL (need ~2 SOL for pool creation)');
    console.log('   - Pool already exists');
    console.log('   - Token accounts not initialized');
    console.log('   - Network issues\n');

    process.exit(1);
  }
}

main();
