#!/usr/bin/env node
/**
 * Create Simple SPL Tokens (NOT Token-2022) for Meteora Pool Testing
 *
 * This creates standard SPL tokens without any extensions to test
 * Meteora pool creation. Token-2022 support is still being finalized in Meteora SDK.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID, // Standard SPL Token program
} from '@solana/spl-token';
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const OUTPUT_FILE = join(homedir(), '.mintcraft/simple-spl-tokens.json');

console.log('🪙 Creating Simple SPL Tokens for Meteora Testing\n');
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
    const connection = new Connection(DEVNET_RPC, 'confirmed');

    // Check SOL balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 SOL Balance: ${balance / 10 ** 9} SOL\n`);

    if (balance < 0.1 * 10 ** 9) {
      console.log('⚠️  Low SOL balance. Run: solana airdrop 2 --url devnet\n');
      process.exit(1);
    }

    // Create Token A (standard SPL Token)
    console.log('Creating Token A (SPL Token)...');
    const tokenA = await createMint(
      connection,
      wallet,
      wallet.publicKey, // mint authority
      wallet.publicKey, // freeze authority
      9, // decimals
      undefined, // keypair (auto-generate)
      undefined, // confirmation options
      TOKEN_PROGRAM_ID // Standard SPL Token
    );
    console.log(`✅ Token A: ${tokenA.toBase58()}`);

    // Create Token B (standard SPL Token)
    console.log('Creating Token B (SPL Token)...');
    const tokenB = await createMint(
      connection,
      wallet,
      wallet.publicKey,
      wallet.publicKey,
      9,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log(`✅ Token B: ${tokenB.toBase58()}\n`);

    // Create token accounts
    console.log('Creating associated token accounts...');
    const tokenAAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      tokenA,
      wallet.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log(`✅ Token A Account: ${tokenAAccount.address.toBase58()}`);

    const tokenBAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      tokenB,
      wallet.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log(`✅ Token B Account: ${tokenBAccount.address.toBase58()}\n`);

    // Mint tokens
    console.log('Minting tokens...');
    const mintAmount = 100_000 * 10 ** 9; // 100k tokens

    await mintTo(
      connection,
      wallet,
      tokenA,
      tokenAAccount.address,
      wallet,
      mintAmount,
      [],
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log(`✅ Minted 100,000 Token A`);

    await mintTo(
      connection,
      wallet,
      tokenB,
      tokenBAccount.address,
      wallet,
      mintAmount,
      [],
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log(`✅ Minted 100,000 Token B\n`);

    // Save token info
    const tokenInfo = {
      tokenA: tokenA.toBase58(),
      tokenB: tokenB.toBase58(),
      wallet: wallet.publicKey.toBase58(),
      tokenAAccount: tokenAAccount.address.toBase58(),
      tokenBAccount: tokenBAccount.address.toBase58(),
      tokenProgram: TOKEN_PROGRAM_ID.toBase58(),
      network: 'devnet',
      created: new Date().toISOString(),
      note: 'Standard SPL tokens (not Token-2022) for Meteora pool testing'
    };

    writeFileSync(OUTPUT_FILE, JSON.stringify(tokenInfo, null, 2));
    console.log(`💾 Token info saved to: ${OUTPUT_FILE}\n`);

    console.log('═'.repeat(60));
    console.log('✅ SPL TOKENS CREATED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Update TOKEN_A and TOKEN_B in scripts/create-meteora-pool.mjs');
    console.log('2. Remove TOKEN_2022_PROGRAM_ID references');
    console.log('3. Run: npm run create:meteora-pool\n');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Token creation failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
