// Imports
const { hexToBuffer, bufferToHex } = await import("https://deno.land/x/hextools@v1.0.0/mod.ts");
const { decode } = await import("https://deno.land/x/cbor@v1.5.9/decode.js");
const { encodeHex } = await import("https://deno.land/std@0.224.0/encoding/hex.ts");
const ethers = await import("npm:ethers@6.10.0");

// const { Data } = await import("https://deno.land/x/lucid@0.10.7/mod.ts")

// const DatumMetadataSchema = Data.Object({
//     beneficiary: Data.Bytes(),
//     status: Data.Bytes(),
//     metadata: Data.Object({
//         data: Data.Any(),
//         version: Data.Integer(),
//         extra: Data.Nullable(Data.Any())
//     }),
// });

// const replacer = (_, value) => {
//     return typeof value == "bigint" ? Number(value.toString()) :
//         value instanceof Map ? mapToObj(value) : value;
// }

// const mapToObj = m => {
//     return Array.from(m).reduce((obj, [key, value]) => {
//         obj[key] = replacer(key, value);
//         return obj;
//     }, {});
// }

// Arguments can be provided when a request is initated on-chain and used in the request source code as shown below

const apiKey = secrets.apiKey;
if (!apiKey) {
  throw Error(
    "BLOCKFROST_API_KEY secret variable not set for Blockfrost API.  Get a free key from https://blockfrost.io"
  );
}

const url = secrets.apiUrl;
if (!url) {
  throw Error(
    "BLOCKFROST_BLOCKCHAIN_URL secret variable not set for Blockfrost API. Check blockchain supported from https://blockfrost.io"
  );
}

const contractAddress = secrets.contractAddress;
if (!contractAddress) {
  throw Error(
    "CARDANO_CONTRACT_ADDRESS variable not set for Blockfrost API"
  );
}

// make sure arguments are provided
if (!args || args.length === 0) throw new Error("input not provided");
let [requestType, policyId, tokenId] = args;

if (!policyId || !tokenId) {
  throw Error(
    "POLICY or TOKEN variable not set for Blockfrost API"
  );
}

const token = policyId + encodeHex(`Lendex#${tokenId}`);
console.log(`TOKEN: ${token} ok??`);
switch (requestType) {
  case "borrow_check":
    return borrowCheck();
  default:
    throw Error(
      "INVALID_REQUEST_TYPE, valid values are: 'borrow_check', 'pay_debt_check', 'lender_claim_check', 'borrower_claim_check'"
    );
}

async function borrowCheck() {
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
    
    // get minted tx (TODO: check only one exist)
    const txs = blockfrostResponse.data.filter(tx => tx.action == "minted" && Number(tx.amount) == 1);
    if (txs.length == 0) {
      throw new Error(`Missing token: ${token}`);
    }
    
    const { tx_hash } = txs[0];
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
    const [{inline_datum}] = outputs.filter(out => 
      out.address == contractAddress && 
      out.amount.some(a => a.unit == token && Number(a.quantity) == 1)
    );
    
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
    
    // TODO: make sure tokens datum uses the same pattern this hardcoded data: [lender, borrower, debt]
    const decodedData = decode(new Uint8Array(hexToBuffer("D87983581D603DCE7844F36B23B8C3F90AFBA40AA188E7F1D3F6E8ACD1D544ED1DA9581D603AFA0EC5EB5349B65248E1700844C01C0698355D2A1F1917DCFC977B1B000000F5792D4F00")));
    
    // const result = JSON.stringify({address, data}, replacer, 2);
    const data = convertCBORData(decodedData);
    const [lender, borrower, debt] = data;
    console.log(`Api Response: ${[lender, borrower, debt]}}`);
    // const result = JSON.stringify({address, data});
    // Functions.encodeUint256() helper function to encode the result from uint256 to bytes
    // return Functions.encodeString(result);
    
    // ABI encoding
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "int"],
      [lender, debt]
    );
    
    // return the encoded data as Uint8Array
    return ethers.getBytes(encoded);
}

