import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import * as Token2022Program from '@solana/spl-token';
import * as MPLMetadata from '@metaplex-foundation/mpl-token-metadata';
import { TokenConfig } from './types';
import { TokenExtensionHandler } from './extensions';
import {
  MAX_WALLET_BPS_CAP,
  createInitializeMaxWalletConfigInstruction,
} from './max-wallet';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);

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
      config
    );
    if (extensionInstructions.length > 0) {
      transaction.add(...extensionInstructions);
    }

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
      Token2022Program.createAssociatedTokenAccountIdempotentInstruction(
        payerWallet,
        associatedTokenAccount,
        payerWallet,
        mintKeypair.publicKey,
        Token2022Program.TOKEN_2022_PROGRAM_ID,
        Token2022Program.ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // Mint initial supply to creator
    if (config.supplyBaseUnits > BigInt(0)) {
      console.log('💰 Adding Mint To instruction for initial supply...');
      transaction.add(
        Token2022Program.createMintToCheckedInstruction(
          mintKeypair.publicKey,
          associatedTokenAccount,
          payerWallet,
          config.supplyBaseUnits,
          config.decimals,
          [],
          Token2022Program.TOKEN_2022_PROGRAM_ID
        )
      );
    }

    // Create metadata account so explorers can resolve token name/symbol
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const sanitizedName = config.name.slice(0, 32);
    const sanitizedSymbol = config.symbol.slice(0, 10);
    const sanitizedUri = (config.metadataUri ?? '').slice(0, 200);

    const [masterEditionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const metadataData = MPLMetadata.getCreateV1InstructionDataSerializer().serialize({
      name: sanitizedName,
      symbol: sanitizedSymbol,
      uri: sanitizedUri,
      sellerFeeBasisPoints: { basisPoints: 0n, decimals: 2 },
      creators: null,
      primarySaleHappened: false,
      isMutable: true,
      tokenStandard: MPLMetadata.TokenStandard.Fungible,
      collection: null,
      uses: null,
      collectionDetails: null,
      ruleSet: null,
      decimals: config.decimals,
      printSupply: null,
    });

    console.log('🪪 Adding Metadata instruction...');
    const metadataInstruction = new TransactionInstruction({
      programId: TOKEN_METADATA_PROGRAM_ID,
      keys: [
        { pubkey: metadataPda, isSigner: false, isWritable: true },
        { pubkey: masterEditionPda, isSigner: false, isWritable: false },
        { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: payerWallet, isSigner: true, isWritable: false }, // authority
        { pubkey: payerWallet, isSigner: true, isWritable: true }, // payer
        { pubkey: payerWallet, isSigner: false, isWritable: false }, // update authority
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: Token2022Program.TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(metadataData),
    });

    transaction.add(metadataInstruction);

    if (
      typeof config.maxWalletPercentage === 'number' &&
      config.maxWalletPercentage > 0
    ) {
      const maxWalletBps = Math.round(config.maxWalletPercentage * 100);
      const clampedBps = Math.min(maxWalletBps, MAX_WALLET_BPS_CAP);

      console.log('🛡️ Initializing max wallet config with', clampedBps, 'bps');
      transaction.add(
        createInitializeMaxWalletConfigInstruction({
          payer: payerWallet,
          authority: payerWallet,
          mint: mintKeypair.publicKey,
          maxWalletBps: clampedBps,
        })
      );
    }

    // Initialize reflection config if reflections are enabled
    if (config.extensions.reflections) {
      console.log('💎 Initializing reflection config...');
      const reflectionInstruction = await this.createInitializeReflectionInstruction(
        mintKeypair.publicKey,
        payerWallet,
        config.extensions.reflections
      );
      transaction.add(reflectionInstruction);
    }

    return { transaction, associatedTokenAccount };
  }

  /**
   * Create instruction to initialize reflection config
   */
  private async createInitializeReflectionInstruction(
    mint: PublicKey,
    authority: PublicKey,
    reflectionsConfig: {
      minHolding: bigint;
      gasRebateBps: number;
      excludedWallets: PublicKey[];
    }
  ): Promise<TransactionInstruction> {
    // MintCraft program deployed on devnet
    const MINTCRAFT_PROGRAM_ID = new PublicKey('Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4');

    // Derive reflection config PDA
    const [reflectionConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('reflection-config'), mint.toBuffer()],
      MINTCRAFT_PROGRAM_ID
    );

    // Anchor instruction discriminator from IDL: initialize_reflection_config
    const discriminator = Buffer.from([113, 189, 201, 109, 238, 114, 172, 13]);

    // Instruction data: discriminator (8 bytes) + min_holding (u64, 8 bytes) + gas_rebate_bps (u16, 2 bytes)
    const instructionData = Buffer.alloc(18);
    discriminator.copy(instructionData, 0);

    // Write min_holding (u64, little-endian)
    instructionData.writeBigUInt64LE(reflectionsConfig.minHolding, 8);

    // Write gas_rebate_bps (u16, little-endian)
    instructionData.writeUInt16LE(reflectionsConfig.gasRebateBps, 16);

    console.log('💎 Reflection config:', {
      mint: mint.toBase58(),
      reflectionConfigPda: reflectionConfigPda.toBase58(),
      minHolding: reflectionsConfig.minHolding.toString(),
      gasRebateBps: reflectionsConfig.gasRebateBps,
      excludedWallets: reflectionsConfig.excludedWallets.length,
    });

    // Accounts must match IDL order: payer, authority, mint, config, system_program
    return new TransactionInstruction({
      programId: MINTCRAFT_PROGRAM_ID,
      keys: [
        { pubkey: authority, isSigner: true, isWritable: true },  // payer
        { pubkey: authority, isSigner: true, isWritable: false }, // authority (same as payer)
        { pubkey: mint, isSigner: false, isWritable: false },     // mint
        { pubkey: reflectionConfigPda, isSigner: false, isWritable: true }, // config
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      data: instructionData,
    });
  }
}
