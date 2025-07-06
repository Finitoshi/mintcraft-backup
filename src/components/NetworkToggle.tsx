import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Globe, Zap } from 'lucide-react';

interface NetworkToggleProps {
  network: WalletAdapterNetwork;
  onNetworkChange: (network: WalletAdapterNetwork) => void;
}

export function NetworkToggle({ network, onNetworkChange }: NetworkToggleProps) {
  const isMainnet = network === WalletAdapterNetwork.Mainnet;

  const handleToggle = (checked: boolean) => {
    onNetworkChange(
      checked ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet
    );
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Zap className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="network-toggle" className="text-sm">Devnet</Label>
      </div>
      
      <Switch
        id="network-toggle"
        checked={isMainnet}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-primary"
      />
      
      <div className="flex items-center space-x-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="network-toggle" className="text-sm">Mainnet</Label>
      </div>
      
      <Badge 
        variant={isMainnet ? "default" : "secondary"}
        className={isMainnet ? "bg-primary" : "bg-secondary"}
      >
        {isMainnet ? "MAINNET" : "DEVNET"}
      </Badge>
    </div>
  );
}