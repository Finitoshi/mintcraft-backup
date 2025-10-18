/**
 * Meteora DLMM Pool Creation API Endpoint
 *
 * Wraps meteora-invent CLI for automated Token-2022 pool creation
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const { writeFileSync } = require('fs');
const { join } = require('path');

const execAsync = promisify(exec);

const METEORA_INVENT_PATH = join(__dirname, '../meteora-invent/studio');
const CONFIG_PATH = join(METEORA_INVENT_PATH, 'config/api_generated_config.jsonc');

/**
 * Create a Meteora DLMM pool for a Token-2022 mint
 *
 * @param {Object} params - Pool creation parameters
 * @param {string} params.tokenMint - Base token mint address (Token-2022)
 * @param {string} params.quoteMint - Quote token mint (default: SOL)
 * @param {number} params.initialPrice - Initial price ratio (default: 1.0)
 * @param {number} params.binStep - Bin step in bps (default: 25 = 0.25%)
 * @param {number} params.feeBps - Trading fee in bps (default: 100 = 1%)
 * @param {string} params.network - Network (devnet/mainnet-beta)
 * @returns {Promise<{poolAddress: string, txHash: string, explorerUrl: string}>}
 */
async function createMeteoraPool({
  tokenMint,
  quoteMint = 'So11111111111111111111111111111111111111112', // SOL
  initialPrice = 1.0,
  binStep = 25,
  feeBps = 100,
  network = 'devnet'
}) {

  console.log('🌊 Creating Meteora DLMM pool...');
  console.log(`   Token: ${tokenMint}`);
  console.log(`   Quote: ${quoteMint}`);
  console.log(`   Network: ${network}`);

  // Generate config file
  const config = {
    rpcUrl: network === 'devnet'
      ? 'https://api.devnet.solana.com'
      : 'https://api.mainnet-beta.solana.com',
    dryRun: false,
    keypairFilePath: './keypair.json',
    computeUnitPriceMicroLamports: 100000,
    quoteMint,
    dlmmConfig: {
      binStep,
      feeBps,
      initialPrice,
      activationType: 1, // Timestamp
      activationPoint: null, // Immediate
      priceRounding: 'up',
      creatorPoolOnOffControl: true,
      hasAlphaVault: false
    }
  };

  // Write config
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('✅ Config generated');

  // Execute CLI command
  const command = `pnpm dlmm-create-pool --baseMint ${tokenMint} --config ./config/api_generated_config.jsonc`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: METEORA_INVENT_PATH,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    console.log('📋 CLI Output:', stdout);
    if (stderr && !stderr.includes('bigint')) { // Ignore bigint warning
      console.warn('⚠️  CLI Warnings:', stderr);
    }

    // Parse pool address and tx hash from output
    const poolMatch = stdout.match(/Pool address: ([A-Za-z0-9]{43,44})/);
    const txMatch = stdout.match(/tx hash: ([A-Za-z0-9]{87,88})/);

    if (!poolMatch || !txMatch) {
      throw new Error('Failed to parse pool address or transaction hash from CLI output');
    }

    const poolAddress = poolMatch[1];
    const txHash = txMatch[1];

    const explorerUrl = network === 'devnet'
      ? `https://devnet.meteora.ag/pools/${poolAddress}`
      : `https://meteora.ag/pools/${poolAddress}`;

    console.log('✅ Pool created successfully!');
    console.log(`   Address: ${poolAddress}`);
    console.log(`   Explorer: ${explorerUrl}`);

    return {
      success: true,
      poolAddress,
      txHash,
      explorerUrl,
      network
    };

  } catch (error) {
    console.error('❌ Pool creation failed:', error.message);

    // Parse error details from stderr
    const errorMessage = error.stderr || error.message;

    throw new Error(`Meteora pool creation failed: ${errorMessage}`);
  }
}

/**
 * Express route handler
 */
async function createMeteoraPoolHandler(req, res) {
  try {
    const {
      tokenMint,
      quoteMint,
      initialPrice,
      binStep,
      feeBps,
      network
    } = req.body;

    // Validation
    if (!tokenMint) {
      return res.status(400).json({
        error: 'tokenMint is required'
      });
    }

    const result = await createMeteoraPool({
      tokenMint,
      quoteMint,
      initialPrice,
      binStep,
      feeBps,
      network
    });

    res.json(result);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: error.message,
      details: 'Failed to create Meteora DLMM pool'
    });
  }
}

module.exports = {
  createMeteoraPool,
  createMeteoraPoolHandler
};
