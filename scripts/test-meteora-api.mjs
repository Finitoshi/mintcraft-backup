#!/usr/bin/env node
/**
 * Test Meteora Pool Creation API
 */

async function testMeteoraAPI() {
  console.log('🧪 Testing Meteora Pool Creation API\n');

  // Test with our Token-2022 mint
  const testPayload = {
    tokenMint: '2QprFJc11wnp2sYp3Psrtoq3BKrxHAnmbgCtJmqnki7b', // Our Token-2022
    quoteMint: 'So11111111111111111111111111111111111111112', // SOL
    initialPrice: 1.5,
    binStep: 25,
    feeBps: 100,
    network: 'devnet'
  };

  console.log('Request:', JSON.stringify(testPayload, null, 2));
  console.log('\nCalling API...\n');

  try {
    const response = await fetch('http://127.0.0.1:3001/api/create-meteora-pool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS!\n');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\n🎉 Pool Created:');
      console.log(`   Address: ${result.poolAddress}`);
      console.log(`   Explorer: ${result.explorerUrl}`);
      console.log(`   Transaction: https://explorer.solana.com/tx/${result.txHash}?cluster=devnet`);
    } else {
      console.log('❌ FAILED:\n', result);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure the API server is running:');
    console.log('   cd api && node server.js');
  }
}

testMeteoraAPI();
