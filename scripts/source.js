// This example shows how to make call an API using a secret
// https://coinmarketcap.com/api/documentation/v1/

// Arguments can be provided when a request is initated on-chain and used in the request source code as shown below

if (!secrets.apiKey) {
    throw Error(
      "BLOCKFROST_API_KEY environment variable not set for Blockfrost API.  Get a free key from https://blockfrost.io"
    );
  }
  
  // build HTTP request object
  
  const blockfrostRequest = Functions.makeHttpRequest({
    url: `https://cardano-mainnet.blockfrost.io/api/v0/blocks/latest`,
    headers: {
      "Content-Type": "application/json",
      "project_id": secrets.apiKey,
    },
  });
  
  // Make the HTTP request
  const blockfrostResponse = await blockfrostRequest;
  
  if (blockfrostResponse.error) {
    throw new Error("Blockfrost Error");
  }
  
  // fetch the price
  const slot = blockfrostResponse.data.slot;
  
  console.log(`Api Response: ${JSON.stringify(blockfrostResponse.data, null, 2)}`);
  
  // Functions.encodeUint256() helper function to encode the result from uint256 to bytes
  return Functions.encodeUint256(slot);
  