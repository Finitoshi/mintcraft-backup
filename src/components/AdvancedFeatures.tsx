import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Info, Zap, Shield, DollarSign, Clock, Users, Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface AdvancedFeature {
  id: string;
  name: string;
  description: string;
  type: string;
  enabled: boolean;
  category: 'transfer-hook' | 'token-2022' | 'backend-cron' | 'integration' | 'frontend';
  riskLevel: 'low' | 'medium' | 'high';
  config?: Record<string, any>;
}

interface AdvancedFeaturesProps {
  features: AdvancedFeature[];
  onFeatureToggle: (featureId: string, enabled: boolean) => void;
  onConfigChange: (featureId: string, config: Record<string, any>) => void;
}

const categoryIcons = {
  'transfer-hook': Zap,
  'token-2022': Shield,
  'backend-cron': Clock,
  'integration': Target,
  'frontend': Users,
};

const categoryColors = {
  'transfer-hook': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  'token-2022': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'backend-cron': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'integration': 'bg-green-500/10 text-green-600 border-green-200',
  'frontend': 'bg-orange-500/10 text-orange-600 border-orange-200',
};

const riskColors = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

export function AdvancedFeatures({ features, onFeatureToggle, onConfigChange }: AdvancedFeaturesProps) {
  const transferHookFeatures = features.filter(f => f.category === 'transfer-hook');
  const token2022Features = features.filter(f => f.category === 'token-2022');
  const backendFeatures = features.filter(f => f.category === 'backend-cron');
  const integrationFeatures = features.filter(f => f.category === 'integration');
  const frontendFeatures = features.filter(f => f.category === 'frontend');

  const renderFeatureConfig = (feature: AdvancedFeature) => {
    if (!feature.enabled || !feature.config) return null;

    return (
      <div className="mt-4 space-y-3 p-4 bg-muted/50 rounded-lg">
        <h5 className="font-medium text-sm">Configuration</h5>
        
        {feature.id === 'dynamic-tax-bands' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="min-fee">Min Fee %</Label>
              <Input id="min-fee" type="number" placeholder="0.5" className="h-8" />
            </div>
            <div>
              <Label htmlFor="max-fee">Max Fee %</Label>
              <Input id="max-fee" type="number" placeholder="5.0" className="h-8" />
            </div>
          </div>
        )}

        {feature.id === 'multi-asset-reflections' && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="reward-tokens">Reward Tokens</Label>
              <Select>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select tokens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sol">SOL</SelectItem>
                  <SelectItem value="usdc">USDC</SelectItem>
                  <SelectItem value="bonk">BONK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="distribution-frequency">Distribution Frequency</Label>
              <Select>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {feature.id === 've-lock-boosts' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="min-lock">Min Lock (weeks)</Label>
              <Input id="min-lock" type="number" placeholder="1" className="h-8" />
            </div>
            <div>
              <Label htmlFor="max-lock">Max Lock (weeks)</Label>
              <Input id="max-lock" type="number" placeholder="52" className="h-8" />
            </div>
          </div>
        )}

        {feature.id === 'rate-limiter' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rate-limit">Tokens/Block</Label>
              <Input id="rate-limit" type="number" placeholder="1000" className="h-8" />
            </div>
            <div>
              <Label htmlFor="time-window">Time Window</Label>
              <Select>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Per Block</SelectItem>
                  <SelectItem value="minute">Per Minute</SelectItem>
                  <SelectItem value="hour">Per Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {feature.id === 'jackpot-blocks' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="jackpot-tax">Jackpot Tax %</Label>
              <Input id="jackpot-tax" type="number" placeholder="1" className="h-8" />
            </div>
            <div>
              <Label htmlFor="draw-frequency">Draw Every (hours)</Label>
              <Input id="draw-frequency" type="number" placeholder="24" className="h-8" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFeatureList = (featureList: AdvancedFeature[], title: string, icon: React.ComponentType<any>) => {
    const IconComponent = icon;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>
            Advanced {title.toLowerCase()} features for your token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {featureList.map((feature) => (
            <div key={feature.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={feature.id} className="font-medium cursor-pointer">
                      {feature.name}
                    </Label>
                    <Badge className={categoryColors[feature.category]} variant="outline">
                      {feature.type}
                    </Badge>
                    <span className={`text-xs font-medium ${riskColors[feature.riskLevel]}`}>
                      {feature.riskLevel.toUpperCase()}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{feature.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
                <Switch
                  id={feature.id}
                  checked={feature.enabled}
                  onCheckedChange={(checked) => onFeatureToggle(feature.id, checked)}
                  className="ml-4"
                />
              </div>
              {renderFeatureConfig(feature)}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <Tabs defaultValue="transfer-hooks" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="transfer-hooks">Transfer Hooks</TabsTrigger>
        <TabsTrigger value="token-extensions">Token Extensions</TabsTrigger>
        <TabsTrigger value="backend">Backend Cron</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
        <TabsTrigger value="frontend">Frontend</TabsTrigger>
      </TabsList>

      <TabsContent value="transfer-hooks" className="space-y-6">
        {renderFeatureList(transferHookFeatures, 'Transfer Hooks', Zap)}
      </TabsContent>

      <TabsContent value="token-extensions" className="space-y-6">
        {renderFeatureList(token2022Features, 'Token Extensions', Shield)}
      </TabsContent>

      <TabsContent value="backend" className="space-y-6">
        {renderFeatureList(backendFeatures, 'Backend Services', Clock)}
      </TabsContent>

      <TabsContent value="integrations" className="space-y-6">
        {renderFeatureList(integrationFeatures, 'Integrations', Target)}
      </TabsContent>

      <TabsContent value="frontend" className="space-y-6">
        {renderFeatureList(frontendFeatures, 'Frontend Features', Users)}
      </TabsContent>
    </Tabs>
  );
}