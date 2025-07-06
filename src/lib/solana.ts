import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeInterestBearingMintInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeNonTransferableMintInstruction,
  createInitializeDefaultAccountStateInstruction,
  createInitializeMintCloseAuthorityInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  ExtensionType,
  AccountState,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  maxWalletPercentage?: number;
  extensions: {
    transferFee?: {
      feeBasisPoints: number;
      maxFee: bigint;
      transferFeeConfigAuthority: PublicKey;
      withdrawWithheldAuthority: PublicKey;
    };
    interestBearing?: {
      rateAuthority: PublicKey;
      rate: number; // basis points
    };
    permanentDelegate?: {
      delegate: PublicKey;
    };
    nonTransferrable?: boolean;
    defaultAccountState?: {
      accountState: AccountState;
    };
    mintCloseAuthority?: {
      closeAuthority: PublicKey;
    };
  };
  authorities: {
    mintAuthority: PublicKey;
    freezeAuthority?: PublicKey;
    updateAuthority?: PublicKey;
  };
  metadataUri?: string;
}

export class SolanaTokenService {
  private connection: Connection;
  private network: WalletAdapterNetwork;

  constructor(network: WalletAdapterNetwork, customRpcUrl?: string) {
    this.network = network;
    const endpoint = customRpcUrl || clusterApiUrl(network);
    this.connection = new Connection(endpoint, 'confirmed');
  }

  /**
   * Calculate the space needed for the mint account based on enabled extensions
   */
  private calculateMintSpace(extensions: TokenConfig['extensions']): number {
    const extensionTypes: ExtensionType[] = [];
    
    if (extensions.transferFee) extensionTypes.push(ExtensionType.TransferFeeConfig);
    if (extensions.interestBearing) extensionTypes.push(ExtensionType.InterestBearingConfig);
    if (extensions.permanentDelegate) extensionTypes.push(ExtensionType.PermanentDelegate);
    if (extensions.nonTransferrable) extensionTypes.push(ExtensionType.NonTransferable);
    if (extensions.defaultAccountState) extensionTypes.push(ExtensionType.DefaultAccountState);
    if (extensions.mintCloseAuthority) extensionTypes.push(ExtensionType.MintCloseAuthority);

    return getMintLen(extensionTypes);
  }

  /**
   * Check SOL balance and validate transaction requirements
   */
  private async validateTransaction(payerWallet: PublicKey): Promise<void> {
    const balance = await this.connection.getBalance(payerWallet);
    const minRequired = 0.01 * LAMPORTS_PER_SOL; // Minimum 0.01 SOL required
    
    if (balance < minRequired) {
      throw new Error(`Insufficient SOL balance. You have ${balance / LAMPORTS_PER_SOL} SOL, but need at least 0.01 SOL for transaction fees. Please fund your wallet from a Devnet faucet.`);
    }
    
    console.log(`✅ SOL balance check passed: ${balance / LAMPORTS_PER_SOL} SOL`);
  }

  /**
   * Create mint account with Token-2022 extensions and initial supply
   */
  async createMintWithExtensions(
    config: TokenConfig,
    payerWallet: PublicKey,
    signTransaction: (transaction: Transaction) => Promise<Transaction>
  ): Promise<{ mintKeypair: Keypair; signature: string; associatedTokenAccount: PublicKey }> {
    console.log('🔨 Starting token creation process...', config);

    // Validate SOL balance first
    await this.validateTransaction(payerWallet);

    const mintKeypair = Keypair.generate();
    const mintSpace = this.calculateMintSpace(config.extensions);
    const mintLamports = await this.connection.getMinimumBalanceForRentExemption(mintSpace);

    // Generate associated token account for initial minting
    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      payerWallet,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
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
        programId: TOKEN_2022_PROGRAM_ID,
      })
    );

    // Add extension instructions BEFORE InitializeMint
    if (config.extensions.transferFee) {
      console.log('💰 Adding Transfer Fee extension...');
      transaction.add(
        createInitializeTransferFeeConfigInstruction(
          mintKeypair.publicKey,
          config.extensions.transferFee.transferFeeConfigAuthority,
          config.extensions.transferFee.withdrawWithheldAuthority,
          config.extensions.transferFee.feeBasisPoints,
          config.extensions.transferFee.maxFee,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (config.extensions.interestBearing) {
      console.log('📈 Adding Interest Bearing extension...');
      transaction.add(
        createInitializeInterestBearingMintInstruction(
          mintKeypair.publicKey,
          config.extensions.interestBearing.rateAuthority,
          config.extensions.interestBearing.rate,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (config.extensions.permanentDelegate) {
      console.log('👑 Adding Permanent Delegate extension...');
      transaction.add(
        createInitializePermanentDelegateInstruction(
          mintKeypair.publicKey,
          config.extensions.permanentDelegate.delegate,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (config.extensions.nonTransferrable) {
      console.log('🔒 Adding Non-Transferable extension...');
      transaction.add(
        createInitializeNonTransferableMintInstruction(
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (config.extensions.defaultAccountState) {
      console.log('🛡️ Adding Default Account State extension...');
      transaction.add(
        createInitializeDefaultAccountStateInstruction(
          mintKeypair.publicKey,
          config.extensions.defaultAccountState.accountState,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (config.extensions.mintCloseAuthority) {
      console.log('🗝️ Adding Mint Close Authority extension...');
      transaction.add(
        createInitializeMintCloseAuthorityInstruction(
          mintKeypair.publicKey,
          config.extensions.mintCloseAuthority.closeAuthority,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    // Initialize the mint (MUST be last)
    console.log('🎯 Adding Initialize Mint instruction...');
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        config.decimals,
        config.authorities.mintAuthority,
        config.authorities.freezeAuthority,
        TOKEN_2022_PROGRAM_ID
      )
    );

    // Create associated token account for initial minting
    console.log('🏦 Adding Associated Token Account instruction...');
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payerWallet,
        associatedTokenAccount,
        payerWallet,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // Mint initial supply to creator
    if (config.supply > 0) {
      console.log('💰 Adding Mint To instruction for initial supply...');
      const mintAmount = BigInt(config.supply) * BigInt(Math.pow(10, config.decimals));
      transaction.add(
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAccount,
          payerWallet,
          mintAmount,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payerWallet;

    // Sign with mint keypair
    transaction.partialSign(mintKeypair);

    console.log('📝 Transaction ready for wallet signing...');
    console.log('🔢 Instructions:', transaction.instructions.length);

    // Have wallet sign the transaction
    const signedTransaction = await signTransaction(transaction);

    // Send transaction
    console.log('🚀 Sending transaction...');
    const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());

    // Confirm transaction
    console.log('⏳ Confirming transaction...', signature);
    await this.connection.confirmTransaction(signature, 'confirmed');

    console.log('✅ Token created successfully!');
    console.log('🪙 Mint Address:', mintKeypair.publicKey.toBase58());
    console.log('🔍 Explorer:', `https://explorer.solana.com/address/${mintKeypair.publicKey.toBase58()}?cluster=${this.network}`);

    return {
      mintKeypair,
      signature,
      associatedTokenAccount,
    };
  }
}