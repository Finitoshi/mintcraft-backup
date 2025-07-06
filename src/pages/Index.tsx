import { useState } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletContextProvider } from '@/contexts/WalletContext';
import { NetworkToggle } from '@/components/NetworkToggle';
import { TokenForm, TokenFormData } from '@/components/TokenForm';
import { Token22Extensions, Token22Extension } from '@/components/Token22Extensions';
import { AdvancedFeatures, AdvancedFeature } from '@/components/AdvancedFeatures';
import { CloneToken } from '@/components/CloneToken';
import { AuthorityManager } from '@/components/AuthorityManager';
import { FeeCalculator } from '@/components/FeeCalculator';
import { TransactionPreview } from '@/components/TransactionPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Coins, Hammer, Shield, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTokenMinting } from '@/hooks/useTokenMinting';

const DEFAULT_ADVANCED_FEATURES: AdvancedFeature[] = [
  { id: 'multi-asset-reflections', name: 'Multi-Asset Reflections', description: 'Withheld fees swap to SOL/USDC/BONK and auto-airdrop', type: 'TransferHook', enabled: false, category: 'transfer-hook', riskLevel: 'medium' },
  { id: 'dynamic-tax-bands', name: 'Dynamic Tax Bands', description: 'Fee % auto-adjusts by 24h volume or oracle price bands', type: 'TransferHook', enabled: false, category: 'transfer-hook', riskLevel: 'high' },
  { id: 've-lock-boosts', name: 'veLock Boosts', description: 'Lock tokens 1-52 weeks; weight = amount × time for voting/yield', type: 'TransferHook', enabled: false, category: 'transfer-hook', riskLevel: 'medium' },
  { id: 'rate-limiter', name: 'Rate Limiter', description: 'Throttle N tokens per address per block/minute', type: 'TransferHook', enabled: false, category: 'transfer-hook', riskLevel: 'low' },
  { id: 'jackpot-blocks', name: 'Jackpot Blocks', description: '1% tax funds pot; random buyer wins every X hours', type: 'TransferHook', enabled: false, category: 'transfer-hook', riskLevel: 'medium' },
];

const DEFAULT_EXTENSIONS: Token22Extension[] = [
  {
    id: 'transfer-fee',
    name: 'Transfer Fee',
    description: 'Charge a fee on every token transfer, withheld to a configurable account',
    enabled: false,
    category: 'fee',
    riskLevel: 'low',
  },
  {
    id: 'interest-bearing',
    name: 'Interest Bearing',
    description: 'Tokens accrue interest over time based on a configurable rate',
    enabled: false,
    category: 'fee',
    riskLevel: 'medium',
  },
  {
    id: 'permanent-delegate',
    name: 'Permanent Delegate',
    description: 'Allows a designated authority to transfer or burn tokens from any account',
    enabled: false,
    category: 'authority',
    riskLevel: 'high',
  },
  {
    id: 'non-transferable',
    name: 'Non-Transferable',
    description: 'Tokens cannot be transferred once minted (soulbound tokens)',
    enabled: false,
    category: 'transfer',
    riskLevel: 'high',
  },
  {
    id: 'default-account-state',
    name: 'Default Account State',
    description: 'Set default freeze state for new token accounts',
    enabled: false,
    category: 'authority',
    riskLevel: 'medium',
  },
  {
    id: 'mint-close-authority',
    name: 'Mint Close Authority',
    description: 'Allow the mint account to be closed and SOL reclaimed',
    enabled: false,
    category: 'authority',
    riskLevel: 'low',
  },
  {
    id: 'confidential-transfers',
    name: 'Confidential Transfers',
    description: 'Enable zero-knowledge proofs for private token transfers',
    enabled: false,
    category: 'security',
    riskLevel: 'low',
  },
  {
    id: 'cpi-guard',
    name: 'CPI Guard',
    description: 'Prevent unauthorized cross-program invocations',
    enabled: false,
    category: 'security',
    riskLevel: 'low',
  },
  {
    id: 'transfer-hook',
    name: 'Transfer Hook',
    description: 'Execute custom program logic on every token transfer',
    enabled: false,
    category: 'transfer',
    riskLevel: 'high',
  },
];

function MintCraftApp() {
  const [network, setNetwork] = useState<WalletAdapterNetwork>(WalletAdapterNetwork.Devnet);
  const [extensions, setExtensions] = useState<Token22Extension[]>(DEFAULT_EXTENSIONS);
  const [advancedFeatures, setAdvancedFeatures] = useState<AdvancedFeature[]>(DEFAULT_ADVANCED_FEATURES);
  const [formData, setFormData] = useState<TokenFormData>({
    name: '',
    symbol: '',
    description: '',
    supply: '1000000',
    decimals: '9',
    maxWalletPercentage: '',
    imageFile: null,
  });

  const { connected } = useWallet();
  const { toast } = useToast();
  
  // Use the real token minting hook
  const { mintToken, status, resetStatus, isLoading } = useTokenMinting(network);

  const handleExtensionToggle = (extensionId: string, enabled: boolean) => {
    setExtensions(prev => 
      prev.map(ext => 
        ext.id === extensionId ? { ...ext, enabled } : ext
      )
    );
  };

  const handleImageUpload = (file: File) => {
    console.log('Image selected for IPFS upload:', file.name);
    toast({
      title: "Image selected",
      description: `${file.name} ready for IPFS upload`,
    });
  };

  const handleMintToken = async () => {
    console.log('🔥 DEBUG: Starting token minting process...');
    console.log('🔥 DEBUG: Connected wallet:', connected);
    console.log('🔥 DEBUG: Form data:', formData);
    console.log('🔥 DEBUG: Extensions:', extensions.filter(ext => ext.enabled));
    console.log('🔥 DEBUG: Network:', network);
    
    if (!connected) {
      console.log('❌ DEBUG: Wallet not connected');
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to mint tokens",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ DEBUG: Wallet connected, proceeding with mint...');
    
    // Reset any previous status
    resetStatus();
    
    try {
      console.log('🚀 DEBUG: Calling mintToken function...');
      // Call the real minting function
      await mintToken(formData, extensions);
      console.log('✅ DEBUG: mintToken completed successfully');
    } catch (error) {
      console.error('❌ DEBUG: mintToken failed with error:', error);
      toast({
        title: "Minting Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const isFormValid = formData.name && formData.symbol && formData.supply && formData.decimals;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-6 mb-6">
            <img 
              src="/lovable-uploads/e7e41419-44a3-4432-9a79-b24a762f7696.png" 
              alt="MintCraft Logo" 
              className="w-24 h-24 pixelated"
            />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-mono">
            ⛏️ Forge advanced Solana SPL Token-2022 assets with custom extensions ⛏️
          </p>
        </div>

        {/* Network & Wallet Section */}
        <div className="minecraft-card p-6 mb-8">
          <h3 className="flex items-center gap-2 font-bold text-lg mb-4 font-mono">
            ⚡ Server & Wallet Connection
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <NetworkToggle network={network} onNetworkChange={setNetwork} />
            <WalletMultiButton className="minecraft-button !bg-emerald-500 hover:!bg-emerald-400 !text-white !border-emerald-600" />
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="basic" className="space-y-8">
          <TabsList className="minecraft-card p-2 grid grid-cols-5 gap-1 bg-gray-800">
            <TabsTrigger value="basic" className="minecraft-button text-xs data-[state=active]:bg-emerald-600">🔨 Craft</TabsTrigger>
            <TabsTrigger value="advanced" className="minecraft-button text-xs data-[state=active]:bg-emerald-600">🧙 Enchant</TabsTrigger>
            <TabsTrigger value="clone" className="minecraft-button text-xs data-[state=active]:bg-emerald-600">📋 Clone</TabsTrigger>
            <TabsTrigger value="authority" className="minecraft-button text-xs data-[state=active]:bg-emerald-600">👑 Authority</TabsTrigger>
            <TabsTrigger value="preview" className="minecraft-button text-xs data-[state=active]:bg-emerald-600">👁️ Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TokenForm 
                formData={formData} 
                onFormChange={setFormData}
                onImageUpload={handleImageUpload}
              />
              <div className="space-y-8">
                <Token22Extensions 
                  extensions={extensions}
                  onExtensionToggle={handleExtensionToggle}
                />
                <FeeCalculator />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced">
            <AdvancedFeatures 
              features={advancedFeatures}
              onFeatureToggle={(id, enabled) => setAdvancedFeatures(prev => prev.map(f => f.id === id ? {...f, enabled} : f))}
              onConfigChange={(id, config) => setAdvancedFeatures(prev => prev.map(f => f.id === id ? {...f, config} : f))}
            />
          </TabsContent>

          <TabsContent value="clone">
            <CloneToken />
          </TabsContent>

          <TabsContent value="authority">
            <AuthorityManager />
          </TabsContent>

          <TabsContent value="preview">
            <TransactionPreview />
          </TabsContent>
        </Tabs>

        {/* Summary & Action */}
        <div className="minecraft-card p-6 mt-8">
          <h3 className="flex items-center gap-2 font-bold text-lg mb-6 font-mono">
            🛡️ Crafting Recipe Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="minecraft-card text-center p-4">
              <div className="text-4xl mb-2">🪙</div>
              <div className="font-bold font-mono">{formData.name || 'Token Name'}</div>
              <div className="text-sm text-muted-foreground font-mono">{formData.symbol || 'SYMBOL'}</div>
            </div>
            
            <div className="minecraft-card text-center p-4">
              <div className="text-2xl font-bold text-primary font-mono">
                {extensions.filter(ext => ext.enabled).length + advancedFeatures.filter(f => f.enabled).length}
              </div>
              <div className="text-sm text-muted-foreground font-mono">🔮 Enchantments</div>
            </div>
            
            <div className="minecraft-card text-center p-4">
              <Badge 
                variant={network === WalletAdapterNetwork.Mainnet ? "default" : "secondary"}
                className="font-mono"
              >
                {network === WalletAdapterNetwork.Mainnet ? "🌍 MAINNET" : "🧪 DEVNET"}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1 font-mono">Target Server</div>
            </div>
          </div>

          <div className="border-t-2 border-gray-600 my-6"></div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="space-y-4 flex-1 max-w-md">
              {/* Progress indicator */}
              {isLoading && (
                <div className="minecraft-card p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin text-emerald-500">⚙️</div>
                      <span className="font-mono text-sm">{status.message}</span>
                    </div>
                    <Progress 
                      value={
                        status.step === 'uploading-image' ? 25 :
                        status.step === 'uploading-metadata' ? 50 :
                        status.step === 'creating-token' ? 75 : 100
                      } 
                      className="h-2"
                    />
                  </div>
                </div>
              )}
              
              {/* Success message */}
              {status.step === 'success' && status.mintAddress && (
                <div className="minecraft-card p-4 bg-emerald-900/50 border-emerald-500">
                  <div className="space-y-2 text-center">
                    <div className="text-2xl">🎉</div>
                    <p className="font-mono text-sm text-emerald-300">Token Forged Successfully!</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Mint: {status.mintAddress.slice(0, 8)}...{status.mintAddress.slice(-4)}
                    </p>
                    <a 
                      href={`https://explorer.solana.com/address/${status.mintAddress}?cluster=${network}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="minecraft-button text-xs !bg-emerald-600 hover:!bg-emerald-500"
                    >
                      🔍 View on Explorer
                    </a>
                  </div>
                </div>
              )}
              
              <button 
                className="minecraft-button bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 text-lg disabled:opacity-50 w-full"
                onClick={handleMintToken}
                disabled={!isFormValid || !connected || isLoading}
              >
                {isLoading ? "⚙️ FORGING..." : "⚒️ FORGE TOKEN ⚒️"}
              </button>
            </div>
            
            <button className="minecraft-button px-6 py-3">
              👁️ Preview Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const [network] = useState<WalletAdapterNetwork>(WalletAdapterNetwork.Devnet);
  
  return (
    <WalletContextProvider network={network}>
      <MintCraftApp />
    </WalletContextProvider>
  );
}
