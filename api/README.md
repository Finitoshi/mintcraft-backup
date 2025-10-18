# MintCraft API

Express.js API server for IPFS uploads and Meteora DLMM pool creation.

## Setup

1. Install dependencies:
```bash
cd api
npm install
```

2. Start the development server:
```bash
npm run dev
```

The API will run on `http://localhost:3001`

## Endpoints

### POST `/api/upload-to-ipfs`
Uploads token image and metadata to IPFS.

**Body (multipart/form-data):**
- `image`: Image file
- `name`: Token name
- `symbol`: Token symbol  
- `description`: Token description
- `maxWalletPercentage`: Optional max wallet percentage

**Response:**
```json
{
  "success": true,
  "metadataUri": "https://ipfs.bitty.money/ipfs/...",
  "imageUri": "https://ipfs.bitty.money/ipfs/..."
}
```

### POST `/api/create-meteora-pool`
Creates a Meteora DLMM liquidity pool for a token (supports Token-2022).

**Body (JSON):**
```json
{
  "tokenMint": "YOUR_TOKEN_MINT_ADDRESS",
  "quoteMint": "So11111111111111111111111111111111111111112",
  "initialPrice": 1.0,
  "binStep": 25,
  "feeBps": 100,
  "network": "devnet"
}
```

**Parameters:**
- `tokenMint` (required): Base token mint address
- `quoteMint` (optional): Quote token mint (default: SOL)
- `initialPrice` (optional): Initial price ratio (default: 1.0)
- `binStep` (optional): Bin step in bps (default: 25 = 0.25%)
- `feeBps` (optional): Trading fee in bps (default: 100 = 1%)
- `network` (optional): Network (default: "devnet")

**Response:**
```json
{
  "success": true,
  "poolAddress": "ABqJ8byaJhA9TRGqt3fZxaYaFRnsKn27ToV4Z2ozbJ2U",
  "txHash": "2pFcW6vLp5MNCY88gUeFwuDE2EpRZo5VbKP5mHEDasQ8hfj5hygqr8Nq1ynHAdMGEhTfi7dQp17qqJEcbgxEoHp8",
  "explorerUrl": "https://devnet.meteora.ag/pools/ABqJ8byaJhA9TRGqt3fZxaYaFRnsKn27ToV4Z2ozbJ2U",
  "network": "devnet"
}
```

**Features:**
- ✅ Automatic Token-2022 detection (via CLI integration)
- ✅ Supports tokens with extensions (transfer fees, hooks, etc.)
- ✅ Jupiter-ready pools (automatically discovered for swaps)
- ✅ Works on both devnet and mainnet

### GET `/api/health`
Health check endpoint.

## Meteora Integration Setup

The Meteora pool creation feature requires the `meteora-invent` CLI toolkit:

```bash
# From project root
git clone https://github.com/MeteoraAg/meteora-invent.git
cd meteora-invent/studio
pnpm install

# Copy your wallet keypair
cp ~/.config/solana/id.json keypair.json
```

The API will automatically use the CLI when creating pools. Configuration is generated dynamically per request.

## Testing

### Test IPFS Upload
```bash
curl -X POST http://localhost:3001/api/upload-to-ipfs \
  -F "image=@/path/to/image.png" \
  -F "name=Test Token" \
  -F "symbol=TEST" \
  -F "description=A test token"
```

### Test Meteora Pool Creation
```bash
# Using the test script
node ../scripts/test-meteora-api.mjs

# Or manual curl
curl -X POST http://localhost:3001/api/create-meteora-pool \
  -H "Content-Type: application/json" \
  -d '{
    "tokenMint": "YOUR_TOKEN_MINT",
    "quoteMint": "So11111111111111111111111111111111111111112",
    "network": "devnet"
  }'
```

## Deployment

You can deploy this API to:
- **Vercel**: Add `vercel.json` configuration
- **Railway**: Connect your GitHub repo
- **Heroku**: Add `Procfile`
- **Your own server**: Use PM2 or similar

Make sure to update the frontend API URL to point to your deployed API endpoint.