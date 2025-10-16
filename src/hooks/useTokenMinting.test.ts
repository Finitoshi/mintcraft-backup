
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTokenMinting } from './useTokenMinting';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, Keypair } from '@solana/web3.js';
import { MAX_WALLET_HOOK_PROGRAM_ID } from '@/lib/solana/max-wallet';
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

let buildTokenCreationTransactionMock: ReturnType<typeof vi.fn> | undefined;
let walletKeypair: Keypair;

vi.mock('@/lib/solana/transaction-builder', () => ({
  TransactionBuilder: vi.fn().mockImplementation(() => {
    buildTokenCreationTransactionMock = vi.fn(async () => {
      const transaction = new Transaction();

      return {
        transaction,
        associatedTokenAccount: Keypair.generate().publicKey,
      };
    });

    return {
      buildTokenCreationTransaction: buildTokenCreationTransactionMock,
    };
  }),
}));

global.fetch = vi.fn();

describe('useTokenMinting', () => {
  const mockSendTransaction = vi.fn().mockResolvedValue('mytesthash');
  const mockConfirmTransaction = vi.fn().mockResolvedValue(null);
  const mockGetLatestBlockhash = vi.fn().mockResolvedValue({
    blockhash: '4wBqA8sHjZ4aVzaE1ZzSAg4g2XJdJ6FjT3jX8vX8aY8H', // A valid base58 string
    lastValidBlockHeight: 100,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    buildTokenCreationTransactionMock = undefined;
    walletKeypair = Keypair.generate();

    (useWallet as vi.Mock).mockReturnValue({
      publicKey: walletKeypair.publicKey,
      sendTransaction: mockSendTransaction,
    });

    (useConnection as vi.Mock).mockReturnValue({
      connection: {
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
      maxWalletPercentage: '',
      enableMaxWallet: false,
    };

    const extensions: any[] = [];

    await act(async () => {
      await result.current.mintToken(formData, extensions);
    });

    expect(result.current.status.step).toBe('success');
    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/upload-to-ipfs', expect.any(Object));
    expect(mockSendTransaction).toHaveBeenCalledOnce();
    const [txArg, connectionArg, optionsArg] = mockSendTransaction.mock.calls[0];
    expect(txArg).toBeInstanceOf(Transaction);
    expect(connectionArg).toHaveProperty('confirmTransaction');
    expect(optionsArg?.signers?.[0]).toBeInstanceOf(Keypair);
    expect(mockConfirmTransaction).toHaveBeenCalledOnce();
    expect(buildTokenCreationTransactionMock).toBeDefined();
    expect(buildTokenCreationTransactionMock!).toHaveBeenCalledOnce();
    const creationConfig = buildTokenCreationTransactionMock!.mock.calls[0][1];
    expect(creationConfig.supplyBaseUnits).toBe(BigInt('1000000000000000'));
    expect(creationConfig.humanReadableSupply).toBe('1000000');
    expect(result.current.status.message).toBe('Token created successfully!');
    expect(result.current.status.txSignature).toBe('mytesthash');
    expect(result.current.status.mintAddress).toBeDefined();
  });

  it('should handle wallet not connected error', async () => {
    (useWallet as vi.Mock).mockReturnValue({
      publicKey: null,
      sendTransaction: null,
    });

    const { result } = renderHook(() => useTokenMinting(WalletAdapterNetwork.Devnet));
    
    const formData = {
      name: 'Test Token',
      symbol: 'TEST',
      decimals: '9',
      supply: '100000a',
      description: 'A test token',
      imageFile: null,
      maxWalletPercentage: '',
      enableMaxWallet: false,
    };
    const extensions: any[] = [];

    await act(async () => {
      await result.current.mintToken(formData, extensions);
    });

    expect(result.current.status.step).toBe('idle');
  });

  it('should enable transfer hook when max wallet percentage provided', async () => {
    const { result } = renderHook(() => useTokenMinting(WalletAdapterNetwork.Devnet));

    const formData = {
      name: 'Test Token',
      symbol: 'TEST',
      decimals: '9',
      supply: '1000000',
      description: 'A test token',
      imageFile: null,
      maxWalletPercentage: '5',
      enableMaxWallet: true,
    };

    const extensions: any[] = [];

    await act(async () => {
      await result.current.mintToken(formData, extensions);
    });

    const configArg = buildTokenCreationTransactionMock!.mock.calls[0][1];
    expect(configArg.maxWalletPercentage).toBe(5);
    expect(configArg.extensions.transferHook).toBeDefined();
    expect(configArg.extensions.transferHook.programId).toEqual(
      MAX_WALLET_HOOK_PROGRAM_ID
    );
  });
});
