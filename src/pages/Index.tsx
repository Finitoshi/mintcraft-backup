import { useState } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletContextProvider } from '@/contexts/WalletContext';
import { NetworkToggle } from '@/components/NetworkToggle';
import { TokenForm, TokenFormData } from '@/components/TokenForm';
import { Token22Extensions, Token22Extension } from '@/components/Token22Extensions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Coins, Hammer, Shield, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [formData, setFormData] = useState<TokenFormData>({
    name: '',
    symbol: '',
    description: '',
    supply: '',
    decimals: '9',
    imageFile: null,
  });

  const { connected } = useWallet();
  const { toast } = useToast();

  const handleExtensionToggle = (extensionId: string, enabled: boolean) => {
    setExtensions(prev => 
      prev.map(ext => 
        ext.id === extensionId ? { ...ext, enabled } : ext
      )
    );
  };

  const handleImageUpload = (file: File) => {
    // TODO: Upload to IPFS using user's node
    console.log('Uploading to IPFS:', file.name);
    toast({
      title: "Image uploaded",
      description: `${file.name} will be uploaded to IPFS`,
    });
  };

  const handleMintToken = () => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to mint tokens",
        variant: "destructive",
      });
      return;
    }

    const enabledExtensions = extensions.filter(ext => ext.enabled);
    
    console.log('Minting token:', {
      network,
      formData,
      extensions: enabledExtensions,
    });

    toast({
      title: "Token minting started",
      description: `Creating ${formData.name} (${formData.symbol}) on ${network}`,
    });
  };

  const isFormValid = formData.name && formData.symbol && formData.supply && formData.decimals;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Hammer className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
              MintCraft
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Forge advanced Solana SPL Token-2022 assets with custom extensions, 
            hooks, and native integrations
          </p>
        </div>

        {/* Network & Wallet Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Network & Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <NetworkToggle network={network} onNetworkChange={setNetwork} />
              <WalletMultiButton className="!bg-primary hover:!bg-primary/90" />
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <TokenForm 
              formData={formData} 
              onFormChange={setFormData}
              onImageUpload={handleImageUpload}
            />
          </div>

          <div className="space-y-8">
            <Token22Extensions 
              extensions={extensions}
              onExtensionToggle={handleExtensionToggle}
            />
          </div>
        </div>

        {/* Summary & Action */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Token Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 border rounded-lg">
                <Coins className="h-8 w-8 mx-auto text-primary mb-2" />
                <div className="font-semibold">{formData.name || 'Token Name'}</div>
                <div className="text-sm text-muted-foreground">{formData.symbol || 'SYMBOL'}</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {extensions.filter(ext => ext.enabled).length}
                </div>
                <div className="text-sm text-muted-foreground">Extensions Enabled</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Badge variant={network === WalletAdapterNetwork.Mainnet ? "default" : "secondary"}>
                  {network === WalletAdapterNetwork.Mainnet ? "MAINNET" : "DEVNET"}
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">Target Network</div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                onClick={handleMintToken}
                disabled={!isFormValid || !connected}
              >
                <Hammer className="h-4 w-4 mr-2" />
                Mint Token
              </Button>
              
              <Button variant="outline" size="lg">
                Preview Transaction
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <WalletContextProvider network={WalletAdapterNetwork.Devnet}>
      <MintCraftApp />
    </WalletContextProvider>
  );
}
