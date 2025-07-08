
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTokenMinting } from './useTokenMinting';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, Keypair, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Mock dependencies
vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: vi.fn(),
  useConnection: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/lib/solana/transaction-builder', () => ({
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    buildTokenCreationTransaction: vi.fn().mockResolvedValue({
      transaction: {
        ...new Transaction(),
        serialize: vi.fn(() => Buffer.from('mock_serialized_transaction')),
      },
      associatedTokenAccount: Keypair.generate().publicKey,
    }),
  })),
}));

global.fetch = vi.fn();

describe('useTokenMinting', () => {
  const mockSignTransaction = vi.fn(async (tx: Transaction) => tx);
  const mockSendRawTransaction = vi.fn().mockResolvedValue('mytesthash');
  const mockConfirmTransaction = vi.fn().mockResolvedValue(null);
  const mockGetLatestBlockhash = vi.fn().mockResolvedValue({
    blockhash: '4wBqA8sHjZ4aVzaE1ZzSAg4g2XJdJ6FjT3jX8vX8aY8H', // A valid base58 string
    lastValidBlockHeight: 100,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    (useWallet as vi.Mock).mockReturnValue({
      publicKey: Keypair.generate().publicKey,
      signTransaction: mockSignTransaction,
    });

    (useConnection as vi.Mock).mockReturnValue({
      connection: {
        sendRawTransaction: mockSendRawTransaction,
        confirmTransaction: mockConfirmTransaction,
        getLatestBlockhash: mockGetLatestBlockhash,
        getMinimumBalanceForRentExemption: vi.fn().mockResolvedValue(2039280),
      },
    });

    (fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, metadataUri: 'ipfs://metadata' }),
    });
  });

  it('should handle a successful token minting process', async () => {
    const { result } = renderHook(() => useTokenMinting(WalletAdapterNetwork.Devnet));

    const formData = {
      name: 'Test Token',
      symbol: 'TEST',
      decimals: '9',
      supply: '1000000',
      description: 'A test token',
      imageFile: new File([new ArrayBuffer(1)], 'test.png', { type: 'image/png' }),
      maxWalletPercentage: ''
    };

    const extensions: any[] = [];

    await act(async () => {
      await result.current.mintToken(formData, extensions);
    });

    expect(result.current.status.step).toBe('success');
    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/upload-to-ipfs', expect.any(Object));
    expect(mockSignTransaction).toHaveBeenCalledOnce();
    expect(mockSendRawTransaction).toHaveBeenCalledOnce();
    expect(mockConfirmTransaction).toHaveBeenCalledOnce();
    expect(result.current.status.message).toBe('Token created successfully!');
    expect(result.current.status.txSignature).toBe('mytesthash');
    expect(result.current.status.mintAddress).toBeDefined();
  });

  it('should handle wallet not connected error', async () => {
    (useWallet as vi.Mock).mockReturnValue({
      publicKey: null,
      signTransaction: null,
    });

    const { result } = renderHook(() => useTokenMinting(WalletAdapterNetwork.Devnet));
    
    const formData = {
      name: 'Test Token',
      symbol: 'TEST',
      decimals: '9',
      supply: '100000a',
      description: 'A test token',
      imageFile: null,
      maxWalletPercentage: ''
    };
    const extensions: any[] = [];

    await act(async () => {
      await result.current.mintToken(formData, extensions);
    });

    expect(result.current.status.step).toBe('idle');
  });
});
