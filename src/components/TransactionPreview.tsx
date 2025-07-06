import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, Eye, FileCode, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TransactionData {
  instructions: Array<{
    program: string;
    instruction: string;
    accounts: string[];
    data: string;
  }>;
  signers: string[];
  estimatedFee: number;
  estimatedCU: number;
}

export function TransactionPreview() {
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  // Mock transaction data
  const transactionData: TransactionData = {
    instructions: [
      {
        program: "Token22 Program",
        instruction: "InitializeMint2",
        accounts: [
          "mintKeypair.publicKey",
          "SYSVAR_RENT_PUBKEY", 
          "TOKEN_2022_PROGRAM_ID"
        ],
        data: "AQAAAAkAAAAGAAAAAA=="
      },
      {
        program: "Token22 Program", 
        instruction: "InitializeTransferFeeConfig",
        accounts: [
          "mintKeypair.publicKey",
          "wallet.publicKey"
        ],
        data: "BQAAAAAAAADIAAAAAAAAADI="
      }
    ],
    signers: ["wallet.publicKey", "mintKeypair.publicKey"],
    estimatedFee: 0.0015,
    estimatedCU: 45000
  };

  const handlePreviewTransaction = () => {
    setShowPreview(true);
    toast({
      title: "Transaction preview generated",
      description: "Review the transaction details before signing",
    });
  };

  const handleExportForMultisig = () => {
    const txData = JSON.stringify(transactionData, null, 2);
    const blob = new Blob([txData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mint-transaction-unsigned.json';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Transaction exported",
      description: "Unsigned transaction ready for multisig approval",
    });
  };

  const copyTransactionData = () => {
    navigator.clipboard.writeText(JSON.stringify(transactionData, null, 2));
    toast({
      title: "Copied to clipboard",
      description: "Transaction data copied successfully",
    });
  };

  const mockRawTx = "01000203c8d842a2f17fd7aab608ce2ea535a6e958650d5b01f57f3d6fb69f8b0c3e2e90900000000000000000000000000000000000000000000000000000000000000000006a7d517192c568ee08a845f62f26b3b71d15d5d7d4c0eb9c5e5b1f0e6b6e3a8a50000000000000000000000000000000000000000000000000000000000000000";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Transaction Preview & Export
        </CardTitle>
        <CardDescription>
          Preview transactions before signing and export for multisig approval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <Button onClick={handlePreviewTransaction} className="flex-1">
            <Eye className="h-4 w-4 mr-2" />
            Preview Transaction
          </Button>
          <Button variant="outline" onClick={handleExportForMultisig}>
            <Download className="h-4 w-4 mr-2" />
            Export for Multisig
          </Button>
        </div>

        {showPreview && (
          <div className="space-y-4">
            <Separator />
            
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="instructions">Instructions</TabsTrigger>
                <TabsTrigger value="raw">Raw Data</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Estimated Fee</div>
                    <div className="text-lg font-bold">{transactionData.estimatedFee} SOL</div>
                    <div className="text-xs text-muted-foreground">
                      ~${(transactionData.estimatedFee * 100).toFixed(2)} USD
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Compute Units</div>
                    <div className="text-lg font-bold">{transactionData.estimatedCU.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      Estimated computation cost
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-semibold">Required Signers</h5>
                  {transactionData.signers.map((signer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <span className="font-mono text-sm">{signer}</span>
                      </div>
                      <Badge variant={signer.includes('wallet') ? 'default' : 'secondary'}>
                        {signer.includes('wallet') ? 'Your Wallet' : 'Generated Keypair'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="instructions" className="space-y-4">
                {transactionData.instructions.map((instruction, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold">{instruction.instruction}</h5>
                      <Badge>{instruction.program}</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">ACCOUNTS</Label>
                        <div className="space-y-1">
                          {instruction.accounts.map((account, i) => (
                            <div key={i} className="font-mono text-xs bg-muted p-2 rounded">
                              {account}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">INSTRUCTION DATA</Label>
                        <div className="font-mono text-xs bg-muted p-2 rounded break-all">
                          {instruction.data}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="raw" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Raw Transaction Data</Label>
                    <Button size="sm" variant="outline" onClick={copyTransactionData}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={mockRawTx}
                    readOnly
                    className="font-mono text-xs min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>JSON Format</Label>
                  <Textarea
                    value={JSON.stringify(transactionData, null, 2)}
                    readOnly
                    className="font-mono text-xs min-h-[200px]"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3">
              <Button className="flex-1">
                <Wallet className="h-4 w-4 mr-2" />
                Sign & Send Transaction
              </Button>
              <Button variant="outline">
                <FileCode className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}