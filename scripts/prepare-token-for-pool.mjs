#!/usr/bin/env node
/**
 * Prepare token for Meteora pool creation by creating token account and minting
 */
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Load wallet
const keypairPath = process.env.HOME + '/.config/solana/id.json';
const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

const mintAddress = process.argv[2];
if (!mintAddress) {
  console.error('Usage: node prepare-token-for-pool.mjs <MINT_ADDRESS>');
  process.exit(1);
}

const mint = new PublicKey(mintAddress);

console.log('🔧 Preparing token for Meteora pool...\n');

try {
  // Create token account
  console.log('Creating token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    wallet.publicKey,
    false,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  
  console.log(`✅ Token account: ${tokenAccount.address.toBase58()}`);
  
  // Mint some tokens
  console.log('\nMinting tokens...');
  const signature = await mintTo(
    connection,
    wallet,
    mint,
    tokenAccount.address,
    wallet.publicKey,
    1_000_000_000, // 1000 tokens with 9 decimals
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  
  console.log(`✅ Minted 1000 tokens`);
  console.log(`   Signature: ${signature}\n`);
  
  console.log('✅ Token ready for pool creation!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
