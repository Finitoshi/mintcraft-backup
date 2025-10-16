import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { TokenFormData } from '@/components/TokenForm';
import { Token22Extension } from '@/components/Token22Extensions';
import { useToast } from '@/hooks/use-toast';
import { TransactionBuilder } from '@/lib/solana/transaction-builder';
import { TokenConfig } from '@/lib/solana/types';
import {
  MAX_WALLET_BPS_CAP,
  MAX_WALLET_HOOK_PROGRAM_ID,
} from '@/lib/solana/max-wallet';
import { convertTokenAmountToBaseUnits } from '@/lib/solana/amount';

// API Base URL - change this to your deployed API URL
const API_BASE_URL = 'http://localhost:3001/api';

export interface MintingStatus {
  step: 'idle' | 'uploading-image' | 'uploading-metadata' | 'creating-token' | 'success' | 'error';
  message: string;
  txSignature?: string;
  mintAddress?: string;
}

export function useTokenMinting(network: WalletAdapterNetwork, customRpcUrl?: string) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<MintingStatus>({
    step: 'idle',
    message: 'Ready to mint',
  });

  const mintToken = useCallback(async (
    formData: TokenFormData,
    extensions: Token22Extension[]
  ) => {
    if (!publicKey || !sendTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to mint tokens",
        variant: "destructive",
      });
      return;
    }

    try {
      let metadataUri = '';

      // Upload to IPFS via API if image provided
      if (formData.imageFile) {
        setStatus({ step: 'uploading-image', message: 'Uploading image to IPFS...' });

        const formDataToSend = new FormData();
        formDataToSend.append('image', formData.imageFile);
        formDataToSend.append('name', formData.name);
        formDataToSend.append('symbol', formData.symbol);
        formDataToSend.append('description', formData.description);
        if (formData.enableMaxWallet && formData.maxWalletPercentage) {
          formDataToSend.append('maxWalletPercentage', formData.maxWalletPercentage);
        }
        formDataToSend.append('decimals', formData.decimals);
        formDataToSend.append('supply', formData.supply);

        const ipfsResponse = await fetch(`${API_BASE_URL}/upload-to-ipfs`, {
          method: 'POST',
          body: formDataToSend,
        });

        if (!ipfsResponse.ok) {
          throw new Error(`IPFS upload failed: ${ipfsResponse.statusText}`);
        }

        const ipfsResult = await ipfsResponse.json();
        
        if (!ipfsResult.success) {
          throw new Error(ipfsResult.error || 'IPFS upload failed');
        }

        metadataUri = ipfsResult.metadataUri;
        setStatus({ step: 'uploading-metadata', message: 'Metadata uploaded to IPFS' });
      }

      // Build token configuration
      const enabledExtensions = extensions.filter(
        (ext) => ext.enabled && ext.available !== false
      );

      const rawMaxWallet = formData.maxWalletPercentage?.trim() ?? '';
      const shouldEnableMaxWallet =
        formData.enableMaxWallet && rawMaxWallet.length > 0;

      let maxWalletPercentageValue: number | undefined;
      if (shouldEnableMaxWallet) {
        const parsed = parseFloat(rawMaxWallet);
        if (Number.isNaN(parsed) || parsed <= 0) {
          throw new Error('Invalid max wallet percentage');
        }
        maxWalletPercentageValue = Math.min(
          parsed,
          MAX_WALLET_BPS_CAP / 100
        );
      }
      
      const decimalsNumber = Number.parseInt(formData.decimals, 10);
      if (Number.isNaN(decimalsNumber) || decimalsNumber < 0 || decimalsNumber > 255) {
        throw new Error('Invalid decimals value');
      }

      const supplyBaseUnits = convertTokenAmountToBaseUnits(formData.supply, decimalsNumber);
      if (supplyBaseUnits <= BigInt(0)) {
        throw new Error('Supply must be greater than zero');
      }

      const tokenConfig: TokenConfig = {
        name: formData.name,
        symbol: formData.symbol,
        decimals: decimalsNumber,
        supplyBaseUnits,
        humanReadableSupply: formData.supply,
        ...(shouldEnableMaxWallet && maxWalletPercentageValue !== undefined
          ? { maxWalletPercentage: maxWalletPercentageValue }
          : {}),
        ...(metadataUri ? { metadataUri } : {}),
        extensions: {},
        authorities: {
          mintAuthority: publicKey,
          freezeAuthority: publicKey,
        },
      };

      // Configure extensions  
      enabledExtensions.forEach(ext => {
        switch (ext.id) {
          case 'transfer-fee':
            tokenConfig.extensions.transferFee = {
              feeBasisPoints: 250, // 2.5%
              maxFee: BigInt(1000 * Math.pow(10, tokenConfig.decimals)),
              transferFeeConfigAuthority: publicKey,
              withdrawWithheldAuthority: publicKey,
            };
            break;
          
          case 'interest-bearing':
            tokenConfig.extensions.interestBearing = {
              rateAuthority: publicKey,
              rate: 500, // 5% APR in basis points
            };
            break;
          
          case 'permanent-delegate':
            tokenConfig.extensions.permanentDelegate = {
              delegate: publicKey,
            };
            break;
          
          case 'non-transferable':
            tokenConfig.extensions.nonTransferrable = true;
            break;
          
          case 'mint-close-authority':
            tokenConfig.extensions.mintCloseAuthority = {
              closeAuthority: publicKey,
            };
            break;

          case 'confidential-transfers':
            tokenConfig.extensions.confidentialTransfers = true;
            break;

          case 'cpi-guard':
            tokenConfig.extensions.cpiGuard = true;
            break;

          case 'transfer-hook':
            tokenConfig.extensions.transferHook = {
              programId: MAX_WALLET_HOOK_PROGRAM_ID,
              authority: publicKey,
            };
            break;
        }
      });

      if (
        shouldEnableMaxWallet &&
        maxWalletPercentageValue !== undefined &&
        !tokenConfig.extensions.transferHook
      ) {
        tokenConfig.extensions.transferHook = {
          programId: MAX_WALLET_HOOK_PROGRAM_ID,
          authority: publicKey,
        };
      }

      setStatus({ step: 'creating-token', message: 'Creating token on Solana...' });

      const transactionBuilder = new TransactionBuilder();
      const mintKeypair = Keypair.generate();

      const { transaction } = await transactionBuilder.buildTokenCreationTransaction(
        connection,
        tokenConfig,
        publicKey,
        mintKeypair
      );

      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection, {
        signers: [mintKeypair],
      });

      await connection.confirmTransaction(signature, 'confirmed');

      setStatus({
        step: 'success',
        message: 'Token created successfully!',
        txSignature: signature,
        mintAddress: mintKeypair.publicKey.toBase58(),
      });

      toast({
        title: "🎉 Token Created Successfully!",
        description: `Mint: ${mintKeypair.publicKey.toBase58().slice(0, 8)}... | View on Explorer: https://explorer.solana.com/address/${mintKeypair.publicKey.toBase58()}?cluster=${network}`,
      });

    } catch (error) {
      console.error('❌ Token minting failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setStatus({
        step: 'error',
        message: `Failed to create token: ${errorMessage}`,
      });

      toast({
        title: "Token Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [publicKey, sendTransaction, network, customRpcUrl, toast, connection]);

  const resetStatus = useCallback(() => {
    setStatus({ step: 'idle', message: 'Ready to mint' });
  }, []);

  return {
    mintToken,
    status,
    resetStatus,
    isLoading: ['uploading-image', 'uploading-metadata', 'creating-token'].includes(status.step),
  };
}
