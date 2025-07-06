import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PublicKey, Transaction } from '@solana/web3.js';
import { TokenFormData } from '@/components/TokenForm';
import { Token22Extension } from '@/components/Token22Extensions';
import { useToast } from '@/hooks/use-toast';

// API Base URL - change this to your deployed API URL
const API_BASE_URL = 'http://localhost:3001/api';

export interface MintingStatus {
  step: 'idle' | 'uploading-image' | 'uploading-metadata' | 'creating-token' | 'success' | 'error';
  message: string;
  txSignature?: string;
  mintAddress?: string;
}

export function useTokenMinting(network: WalletAdapterNetwork, customRpcUrl?: string) {
  const { publicKey, signTransaction } = useWallet();
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
    if (!publicKey || !signTransaction) {
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
        if (formData.maxWalletPercentage) {
          formDataToSend.append('maxWalletPercentage', formData.maxWalletPercentage);
        }

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
      const enabledExtensions = extensions.filter(ext => ext.enabled);
      
      const tokenConfig = {
        name: formData.name,
        symbol: formData.symbol,
        decimals: parseInt(formData.decimals),
        supply: parseInt(formData.supply),
        metadataUri,
        extensions: {} as any,
      };

      // Configure extensions  
      enabledExtensions.forEach(ext => {
        switch (ext.id) {
          case 'transfer-fee':
            tokenConfig.extensions.transferFee = {
              feeBasisPoints: 250, // 2.5%
              maxFee: (1000 * Math.pow(10, tokenConfig.decimals)).toString(), // Max 1000 tokens as string
              transferFeeConfigAuthority: publicKey.toBase58(),
              withdrawWithheldAuthority: publicKey.toBase58(),
            };
            break;
          
          case 'interest-bearing':
            tokenConfig.extensions.interestBearing = {
              rateAuthority: publicKey.toBase58(),
              rate: 500, // 5% APR in basis points
            };
            break;
          
          case 'permanent-delegate':
            tokenConfig.extensions.permanentDelegate = {
              delegate: publicKey.toBase58(),
            };
            break;
          
          case 'non-transferable':
            tokenConfig.extensions.nonTransferrable = true;
            break;
          
          case 'mint-close-authority':
            tokenConfig.extensions.mintCloseAuthority = {
              closeAuthority: publicKey.toBase58(),
            };
            break;
        }
      });

      setStatus({ step: 'creating-token', message: 'Creating token on Solana...' });

      // Call API to create token transaction
      const mintResponse = await fetch(`${API_BASE_URL}/mint-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenConfig,
          userPublicKey: publicKey.toBase58(),
          network,
          customRpcUrl,
        }),
      });

      if (!mintResponse.ok) {
        throw new Error(`Token creation failed: ${mintResponse.statusText}`);
      }

      const mintResult = await mintResponse.json();
      
      if (!mintResult.success) {
        throw new Error(mintResult.error || 'Token creation failed');
      }

      // Deserialize and sign the transaction
      const transaction = Transaction.from(Buffer.from(mintResult.transaction, 'base64'));
      const signedTransaction = await signTransaction(transaction);
      
      // Send the signed transaction
      const { connection } = useConnection();
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      setStatus({
        step: 'success',
        message: 'Token created successfully!',
        txSignature: signature,
        mintAddress: mintResult.mintAddress,
      });

      toast({
        title: "🎉 Token Created Successfully!",
        description: `Mint: ${mintResult.mintAddress.slice(0, 8)}... | View on Explorer: https://explorer.solana.com/address/${mintResult.mintAddress}?cluster=${network}`,
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
  }, [publicKey, signTransaction, network, customRpcUrl, toast]);

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