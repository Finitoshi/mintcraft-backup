# MintCraft API

Express.js API server for handling Solana Token-2022 creation and IPFS uploads.

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

### POST `/api/mint-token`
Creates a Solana Token-2022 with extensions.

**Body (JSON):**
```json
{
  "tokenConfig": {
    "name": "My Token",
    "symbol": "MTK",
    "decimals": 9,
    "supply": 1000000,
    "metadataUri": "https://ipfs.bitty.money/ipfs/...",
    "extensions": {
      "transferFee": {
        "feeBasisPoints": 250,
        "maxFee": "1000000000000",
        "transferFeeConfigAuthority": "...",
        "withdrawWithheldAuthority": "..."
      }
    }
  },
  "userPublicKey": "...",
  "network": "devnet",
  "customRpcUrl": "optional"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": "base64EncodedTransaction",
  "mintAddress": "mintPublicKey"
}
```

### GET `/api/health`
Health check endpoint.

## Deployment

You can deploy this API to:
- **Vercel**: Add `vercel.json` configuration
- **Railway**: Connect your GitHub repo
- **Heroku**: Add `Procfile`
- **Your own server**: Use PM2 or similar

Make sure to update the frontend API URL to point to your deployed API endpoint.