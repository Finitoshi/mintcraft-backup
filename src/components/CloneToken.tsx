import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Search, ExternalLink, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  extensions: string[];
  authority: string;
  freezeAuthority: string;
}

export function CloneToken() {
  const [mintAddress, setMintAddress] = useState('');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFetchToken = async () => {
    if (!mintAddress.trim()) {
      toast({
        title: "Invalid mint address",
        description: "Please enter a valid mint address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Mock token info - replace with actual RPC call
    setTimeout(() => {
      setTokenInfo({
        mint: mintAddress,
        name: "Example Token",
        symbol: "EXAMPLE",
        decimals: 9,
        supply: "1000000000",
        extensions: ["TransferFee", "MintCloseAuthority"],
        authority: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        freezeAuthority: "null",
      });
      setLoading(false);
      
      toast({
        title: "Token fetched",
        description: "Token information loaded successfully",
      });
    }, 1500);
  };

  const handleCloneToken = () => {
    if (!tokenInfo) return;
    
    toast({
      title: "Token cloned",
      description: `Cloned ${tokenInfo.symbol} configuration to form`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Copy className="h-5 w-5" />
          Clone Existing Token
        </CardTitle>
        <CardDescription>
          Import configuration from an existing Token-2022 mint
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="mint-address">Token Mint Address</Label>
          <div className="flex gap-2">
            <Input
              id="mint-address"
              placeholder="Enter mint address to clone..."
              value={mintAddress}
              onChange={(e) => setMintAddress(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={handleFetchToken} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Fetching..." : "Fetch"}
            </Button>
          </div>
        </div>

        {tokenInfo && (
          <div className="space-y-4">
            <Separator />
            
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                Token Information
                <Badge variant="outline">On-Chain Data</Badge>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">NAME</Label>
                    <p className="font-medium">{tokenInfo.name}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">SYMBOL</Label>
                    <p className="font-medium">{tokenInfo.symbol}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">DECIMALS</Label>
                    <p className="font-medium">{tokenInfo.decimals}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">TOTAL SUPPLY</Label>
                    <p className="font-medium">{parseInt(tokenInfo.supply).toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">EXTENSIONS</Label>
                    <div className="flex flex-wrap gap-1">
                      {tokenInfo.extensions.map((ext) => (
                        <Badge key={ext} variant="secondary" className="text-xs">
                          {ext}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">MINT AUTHORITY</Label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {tokenInfo.authority}
                    </p>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(tokenInfo.authority)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">FREEZE AUTHORITY</Label>
                  <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {tokenInfo.freezeAuthority}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-yellow-800">
                      Authority Warning
                    </p>
                    <p className="text-xs text-yellow-700">
                      This token still has mint/freeze authorities. Consider the security implications 
                      before cloning this configuration.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleCloneToken} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Clone Configuration
                </Button>
                <Button variant="outline">
                  View on Explorer
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}