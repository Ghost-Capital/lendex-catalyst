// Imports
const { hexToBuffer, bufferToHex } = await import("https://deno.land/x/hextools@v1.0.0/mod.ts");
const { decode } = await import("https://deno.land/x/cbor@v1.5.9/decode.js");
const { encodeHex } = await import("https://deno.land/std@0.224.0/encoding/hex.ts");
const ethers = await import("npm:ethers@6.10.0");

const policyId = "eef2d298b856d433d01b83b5b2a4318767845589bee6fecc890c8655";
const contractAddress = "addr_test1wrt2zjjdqfaulpcmnv6gwzavpaajjgsxfklk3zmjnx3y30qz42a4w";
const url = "https://cardano-preview.blockfrost.io/api/v0";

// Arguments can be provided when a request is initated on-chain and used in the request source code as shown below
const apiKey = secrets.apiKey;
if (!apiKey) {
  throw Error(
    `BLOCKFROST_API_KEY secret variable not set for Blockfrost API.  Get a free key from ${url}`
  );
}

// make sure arguments are provided
if (!args || args.length === 0) throw new Error("input not provided");
const [requestType, tokenId] = args;

const token = policyId + encodeHex(`Lendex#${tokenId}`);
console.log(`TOKEN: ${token} ok??`);

// Convert Uint8Array to string
function uint8ArrayToString(uint8Array) {
  // return String.fromCharCode.apply(null, uint8Array);
  return bufferToHex(uint8Array)
}

// Function to recursively extract and convert CBOR data
function convertCBORData(obj) {
  if (Array.isArray(obj)) {
    return obj.map(convertCBORData);
  } else if (typeof obj === 'object') {
    if (obj instanceof Uint8Array) {
      return uint8ArrayToString(obj);
    } else if (obj.hasOwnProperty('value') && obj.hasOwnProperty('tag')) {
      // Handle specific tags
      if (obj.tag === 121) {
        return convertCBORData(obj.value);
      }
    } else {
      const result = {};
      for (const key in obj) {
        result[key] = convertCBORData(obj[key]);
      }
      return result;
    }
  } else {
    return obj;
  }
}

async function getTokenHistory(token) {
    // get token history
    const blockfrostRequest = Functions.makeHttpRequest({
      url: `${url}/assets/${token}/history?order=desc`,
      headers: {
        "Content-Type": "application/json",
        "project_id": apiKey,
      },
    });
  
    // Make the HTTP request
    const blockfrostResponse = await blockfrostRequest;
  
    if (blockfrostResponse.error) {
      throw new Error("Blockfrost Error");
    }

    return blockfrostResponse.data;
}

async function getTokenData(tx) {
  const { tx_hash } = tx;
  // get tx UTxOs
  const utxosRequest = await Functions.makeHttpRequest({
    url: `${url}/txs/${tx_hash}/utxos`,
    headers: {
      "Content-Type": "application/json",
      "project_id": apiKey,
    },
  });

  const utxosResponse = await utxosRequest;
  if (utxosResponse.error) {
    throw new Error("Blockfrost Error");
  }

  const { outputs } = utxosResponse.data;
  const [{ inline_datum }] = outputs.filter(out =>
    out.address == contractAddress &&
    out.amount.some(a => a.unit == token && Number(a.quantity) == 1)
  );

  // datum pattern: [lender, borrower, debt]
  const decodedData = decode(new Uint8Array(hexToBuffer(inline_datum)));

  return convertCBORData(decodedData);
}

async function borrowCheck(token) {
  // get token history
  const tokenHistory = await getTokenHistory(token);

  // get minted tx (TODO: check only one exist)
  const txs = tokenHistory.filter(tx => tx.action == "minted" && Number(tx.amount) == 1);
  if (txs.length == 0) {
    throw new Error(`Missing token: ${token}`);
  }

  const data = await getTokenData(txs[0]);
  const [lender, borrower, debt, _, [fee_n, fee_d]] = data;
  console.log(`Api Response: ${[lender, borrower, debt]}}`);

  // ABI encoding
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "int", "int", "int"],
    [borrower, debt, fee_n, fee_d]
  );

  // return the encoded data as Uint8Array
  return ethers.getBytes(encoded);
}

async function payDebtCheck() {
    // get token history
    const tokenHistory = await getTokenHistory(token);

    // get burned tx (TODO: check only one exist)
    const txs = tokenHistory.filter(tx => tx.action == "burned" && Number(tx.amount) == -1);
    if (txs.length == 0) {
      throw new Error(`Missing token: ${token}`);
    }
  
    const data = await getTokenData(txs[0]);
    const [lender, borrower, debt] = data;
    console.log(`Api Response: ${[lender, borrower, debt]}}`);
  
    // ABI encoding
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "int"],
      [lender, debt]
    );
  
    // return the encoded data as Uint8Array
    return ethers.getBytes(encoded);
}

switch (requestType) {
  case "borrow_check":
    return borrowCheck(token);
  case "pay_debt_check":
    return payDebtCheck(token);
  default:
    throw Error(
      "INVALID_REQUEST_TYPE, valid values are: 'borrow_check', 'pay_debt_check', 'lender_claim_check', 'borrower_claim_check'"
    );
}