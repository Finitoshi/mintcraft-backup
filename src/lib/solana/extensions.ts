import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeTransferFeeConfigInstruction,
  createInitializeInterestBearingMintInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeNonTransferableMintInstruction,
  createInitializeDefaultAccountStateInstruction,
  createInitializeMintCloseAuthorityInstruction,
  getMintLen,
  ExtensionType,
} from '@solana/spl-token';
import { TokenConfig } from './types';

export class TokenExtensionHandler {
  /**
   * Calculate the space needed for the mint account based on enabled extensions
   */
  calculateMintSpace(extensions: TokenConfig['extensions']): number {
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
   * Create extension instructions for the mint
   */
  createExtensionInstructions(
    mintPublicKey: PublicKey,
    extensions: TokenConfig['extensions']
  ): TransactionInstruction[] {
    const instructions: TransactionInstruction[] = [];

    if (extensions.transferFee) {
      console.log('💰 Adding Transfer Fee extension...');
      instructions.push(
        createInitializeTransferFeeConfigInstruction(
          mintPublicKey,
          extensions.transferFee.transferFeeConfigAuthority,
          extensions.transferFee.withdrawWithheldAuthority,
          extensions.transferFee.feeBasisPoints,
          extensions.transferFee.maxFee,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (extensions.interestBearing) {
      console.log('📈 Adding Interest Bearing extension...');
      instructions.push(
        createInitializeInterestBearingMintInstruction(
          mintPublicKey,
          extensions.interestBearing.rateAuthority,
          extensions.interestBearing.rate,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (extensions.permanentDelegate) {
      console.log('👑 Adding Permanent Delegate extension...');
      instructions.push(
        createInitializePermanentDelegateInstruction(
          mintPublicKey,
          extensions.permanentDelegate.delegate,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (extensions.nonTransferrable) {
      console.log('🔒 Adding Non-Transferable extension...');
      instructions.push(
        createInitializeNonTransferableMintInstruction(
          mintPublicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (extensions.defaultAccountState) {
      console.log('🛡️ Adding Default Account State extension...');
      instructions.push(
        createInitializeDefaultAccountStateInstruction(
          mintPublicKey,
          extensions.defaultAccountState.accountState,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (extensions.mintCloseAuthority) {
      console.log('🗝️ Adding Mint Close Authority extension...');
      instructions.push(
        createInitializeMintCloseAuthorityInstruction(
          mintPublicKey,
          extensions.mintCloseAuthority.closeAuthority,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    return instructions;
  }
}