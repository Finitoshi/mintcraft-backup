#!/usr/bin/env node
/**
 * Create Two Simple Test Tokens for Pool Testing
 *
 * Creates two Token-2022 mints WITHOUT any extensions
 * so they're compatible with Orca Whirlpools.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const MINT_AMOUNT = 100_000 * 10 ** 9; // 100k tokens with 9 decimals

console.log('🪙 Creating Simple Test Tokens for Pool\n');
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
    const payer = loadKeypair(walletPath);
    console.log(`✅ Wallet: ${payer.publicKey.toBase58()}\n`);

    const connection = new Connection(DEVNET_RPC, 'confirmed');

    // Check SOL balance
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`💰 SOL Balance: ${balance / 10 ** 9} SOL\n`);

    if (balance < 0.5 * 10 ** 9) {
      console.log('⚠️  Warning: Low SOL balance. You may need to airdrop more SOL.');
      console.log('   Run: solana airdrop 2 --url devnet\n');
    }

    // Create Token A
    console.log('🏗️  Creating Token A (simple, no extensions)...');
    const tokenAMint = await createMint(
      connection,
      payer,
      payer.publicKey, // mint authority
      null, // freeze authority
      9, // decimals
      undefined, // keypair (let it generate)
      undefined, // confirmOptions
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`✅ Token A created: ${tokenAMint.toBase58()}\n`);

    // Create Token B
    console.log('🏗️  Creating Token B (simple, no extensions)...');
    const tokenBMint = await createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      9,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`✅ Token B created: ${tokenBMint.toBase58()}\n`);

    // Get or create ATAs
    console.log('📦 Getting token accounts...');
    const tokenAAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      tokenAMint,
      payer.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`✅ Token A account: ${tokenAAccount.address.toBase58()}`);

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
    console.log(`✅ Token B account: ${tokenBAccount.address.toBase58()}\n`);

    // Mint tokens
    console.log(`💰 Minting ${MINT_AMOUNT / 10 ** 9} of each token...\n`);

    console.log('Minting Token A...');
    await mintTo(
      connection,
      payer,
      tokenAMint,
      tokenAAccount.address,
      payer,
      MINT_AMOUNT,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`✅ Minted ${MINT_AMOUNT / 10 ** 9} Token A`);

    console.log('Minting Token B...');
    await mintTo(
      connection,
      payer,
      tokenBMint,
      tokenBAccount.address,
      payer,
      MINT_AMOUNT,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`✅ Minted ${MINT_AMOUNT / 10 ** 9} Token B\n`);

    // Save config
    const config = {
      tokenA: tokenAMint.toBase58(),
      tokenB: tokenBMint.toBase58(),
      wallet: payer.publicKey.toBase58(),
      tokenAAccount: tokenAAccount.address.toBase58(),
      tokenBAccount: tokenBAccount.address.toBase58(),
      network: 'devnet',
      created: new Date().toISOString(),
    };

    const configDir = join(homedir(), '.mintcraft');
    const configPath = join(configDir, 'simple-test-tokens.json');

    try {
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`💾 Config saved to: ${configPath}\n`);
    } catch (err) {
      console.log(`⚠️  Could not save config: ${err.message}`);
      console.log('   (This is okay, config printed below)\n');
    }

    // Summary
    console.log('═'.repeat(60));
    console.log('🎉 TEST TOKENS CREATED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('\n📋 Configuration:\n');
    console.log(JSON.stringify(config, null, 2));
    console.log('\n');

    console.log('🌊 Next Step: Create Orca Pool');
    console.log('═'.repeat(60));
    console.log('\nUpdate scripts/create-orca-pool.mjs with:');
    console.log(`   TOKEN_A = '${tokenAMint.toBase58()}'`);
    console.log(`   TOKEN_B = '${tokenBMint.toBase58()}'`);
    console.log('\nThen run:');
    console.log('   node scripts/create-orca-pool.mjs\n');

    return config;

  } catch (error) {
    console.error('\n❌ Token creation failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
