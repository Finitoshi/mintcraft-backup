import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import * as Token2022Program from '@solana/spl-token';
import { TokenConfig } from './types';
import { TokenExtensionHandler } from './extensions';

export class TransactionBuilder {
  private extensionHandler: TokenExtensionHandler;

  constructor() {
    this.extensionHandler = new TokenExtensionHandler();
  }

  /**
   * Build complete transaction for token creation with extensions
   */
  async buildTokenCreationTransaction(
    connection: Connection,
    config: TokenConfig,
    payerWallet: PublicKey,
    mintKeypair: Keypair
  ): Promise<{ transaction: Transaction; associatedTokenAccount: PublicKey }> {
    const mintSpace = this.extensionHandler.calculateMintSpace(config.extensions);
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintSpace);

    // Generate associated token account for initial minting
    const associatedTokenAccount = Token2022Program.getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      payerWallet,
      false,
      Token2022Program.TOKEN_2022_PROGRAM_ID,
      Token2022Program.ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log('📊 Mint account details:', {
      address: mintKeypair.publicKey.toBase58(),
      space: mintSpace,
      rent: `${mintLamports / 1e9} SOL`,
      associatedTokenAccount: associatedTokenAccount.toBase58(),
    });

    const transaction = new Transaction();

    // Create mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payerWallet,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintSpace,
        lamports: mintLamports,
        programId: Token2022Program.TOKEN_2022_PROGRAM_ID,
      })
    );

    // Add extension instructions BEFORE InitializeMint
    const extensionInstructions = this.extensionHandler.createExtensionInstructions(
      mintKeypair.publicKey,
      config.extensions
    );
    transaction.add(...extensionInstructions);

    // Initialize the mint (MUST be last)
    console.log('🎯 Adding Initialize Mint instruction...');
    transaction.add(
      Token2022Program.createInitializeMintInstruction(
        mintKeypair.publicKey,
        config.decimals,
        config.authorities.mintAuthority,
        config.authorities.freezeAuthority,
        Token2022Program.TOKEN_2022_PROGRAM_ID
      )
    );

    // Create associated token account for initial minting
    console.log('🏦 Adding Associated Token Account instruction...');
    transaction.add(
      Token2022Program.createAssociatedTokenAccountInstruction(
        payerWallet,
        associatedTokenAccount,
        payerWallet,
        mintKeypair.publicKey,
        Token2022Program.TOKEN_2022_PROGRAM_ID,
        Token2022Program.ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // Mint initial supply to creator
    if (config.supply > 0) {
      console.log('💰 Adding Mint To instruction for initial supply...');
      const mintAmount = BigInt(config.supply) * BigInt(Math.pow(10, config.decimals));
      transaction.add(
        Token2022Program.createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAccount,
          payerWallet,
          mintAmount,
          [],
          Token2022Program.TOKEN_2022_PROGRAM_ID
        )
      );
    }

    return { transaction, associatedTokenAccount };
  }
}