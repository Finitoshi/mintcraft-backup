import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Shield, Lock, Key, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Authority {
  type: 'mint' | 'freeze' | 'update';
  current: string;
  enabled: boolean;
  revocable: boolean;
}

export function AuthorityManager() {
  const [authorities, setAuthorities] = useState<Authority[]>([
    {
      type: 'mint',
      current: 'Your Wallet',
      enabled: true,
      revocable: true,
    },
    {
      type: 'freeze',
      current: 'None',
      enabled: false,
      revocable: false,
    },
    {
      type: 'update',
      current: 'Your Wallet',
      enabled: true,
      revocable: true,
    },
  ]);

  const [newAuthority, setNewAuthority] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const { toast } = useToast();

  const handleAuthorityToggle = (type: Authority['type'], enabled: boolean) => {
    setAuthorities(prev => 
      prev.map(auth => 
        auth.type === type ? { ...auth, enabled } : auth
      )
    );
  };

  const handleRevokeAuthority = (type: Authority['type']) => {
    if (confirmationText !== 'REVOKE PERMANENTLY') {
      toast({
        title: "Confirmation required",
        description: "Please type 'REVOKE PERMANENTLY' to confirm",
        variant: "destructive",
      });
      return;
    }

    setAuthorities(prev => 
      prev.map(auth => 
        auth.type === type 
          ? { ...auth, current: 'None', enabled: false, revocable: false }
          : auth
      )
    );

    setConfirmationText('');
    toast({
      title: "Authority revoked",
      description: `${type} authority has been permanently revoked`,
    });
  };

  const handleTransferAuthority = (type: Authority['type']) => {
    if (!newAuthority.trim()) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid wallet address",
        variant: "destructive",
      });
      return;
    }

    setAuthorities(prev => 
      prev.map(auth => 
        auth.type === type ? { ...auth, current: newAuthority } : auth
      )
    );

    setNewAuthority('');
    toast({
      title: "Authority transferred",
      description: `${type} authority transferred to ${newAuthority.slice(0, 8)}...`,
    });
  };

  const getAuthorityIcon = (type: Authority['type']) => {
    switch (type) {
      case 'mint': return Key;
      case 'freeze': return Lock;
      case 'update': return Shield;
    }
  };

  const getAuthorityDescription = (type: Authority['type']) => {
    switch (type) {
      case 'mint': return 'Ability to mint new tokens and increase supply';
      case 'freeze': return 'Ability to freeze/unfreeze token accounts';
      case 'update': return 'Ability to update token metadata and extensions';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authority Management
        </CardTitle>
        <CardDescription>
          Manage token authorities with permanent revocation options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-red-500/10 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-800">
                Irreversible Action Warning
              </p>
              <p className="text-xs text-red-700">
                Revoking authorities is permanent and cannot be undone. This action will make 
                your token more decentralized but removes your ability to mint new tokens or 
                make updates.
              </p>
            </div>
          </div>
        </div>

        {authorities.map((authority) => {
          const IconComponent = getAuthorityIcon(authority.type);
          
          return (
            <div key={authority.type} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    <Label className="font-medium capitalize">
                      {authority.type} Authority
                    </Label>
                    <Badge variant={authority.current === 'None' ? 'secondary' : 'default'}>
                      {authority.current === 'None' ? 'Revoked' : 'Active'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getAuthorityDescription(authority.type)}
                  </p>
                </div>
                
                <Switch
                  checked={authority.enabled}
                  onCheckedChange={(checked) => handleAuthorityToggle(authority.type, checked)}
                  disabled={authority.current === 'None'}
                />
              </div>

              {authority.enabled && authority.current !== 'None' && (
                <div className="space-y-3">
                  <Separator />
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">CURRENT AUTHORITY</Label>
                    <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {authority.current}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="new-authority" className="text-xs">
                        Transfer to Address
                      </Label>
                      <Input
                        id="new-authority"
                        placeholder="Enter wallet address..."
                        value={newAuthority}
                        onChange={(e) => setNewAuthority(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => handleTransferAuthority(authority.type)}
                      className="mt-auto"
                    >
                      Transfer
                    </Button>
                  </div>

                  {authority.revocable && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Permanently Revoke Authority
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            Permanently Revoke {authority.type} Authority?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. Once revoked, no one will be able to 
                            use this authority ever again. Type "REVOKE PERMANENTLY" to confirm.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        
                        <div className="py-4">
                          <Input
                            placeholder="Type: REVOKE PERMANENTLY"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                          />
                        </div>

                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setConfirmationText('')}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRevokeAuthority(authority.type)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Permanently Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}