import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface Token22Extension {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'fee' | 'authority' | 'transfer' | 'security';
  riskLevel: 'low' | 'medium' | 'high';
  available?: boolean;
}

interface Token22ExtensionsProps {
  extensions: Token22Extension[];
  onExtensionToggle: (extensionId: string, enabled: boolean) => void;
}

const categoryColors = {
  fee: 'bg-blue-500/10 text-blue-600 border-blue-200',
  authority: 'bg-purple-500/10 text-purple-600 border-purple-200',
  transfer: 'bg-green-500/10 text-green-600 border-green-200',
  security: 'bg-orange-500/10 text-orange-600 border-orange-200',
};

const riskColors = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

export function Token22Extensions({ extensions, onExtensionToggle }: Token22ExtensionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Token-2022 Extensions
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Enable advanced Token-2022 features for your token</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Configure advanced token features using Solana's Token-2022 program
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {extensions.map((extension) => {
          const isComingSoon = extension.available === false;
          return (
          <div key={extension.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor={extension.id} className="font-medium cursor-pointer">
                  {extension.name}
                </Label>
                <Badge className={categoryColors[extension.category]} variant="outline">
                  {extension.category}
                </Badge>
                {isComingSoon && (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    Coming Soon
                  </Badge>
                )}
                <span className={`text-xs font-medium ${riskColors[extension.riskLevel]}`}>
                  {extension.riskLevel.toUpperCase()} RISK
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {extension.description}
              </p>
            </div>
            <Switch
              id={extension.id}
              checked={extension.enabled}
              disabled={isComingSoon}
              onCheckedChange={(checked) => onExtensionToggle(extension.id, checked)}
              className="ml-4"
            />
          </div>
        )})}
      </CardContent>
    </Card>
  );
}
