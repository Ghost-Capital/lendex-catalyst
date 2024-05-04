const fs = require("fs");
const path = require("path");
const {
  SubscriptionManager,
  SecretsManager,
  simulateScript,
  ResponseListener,
  ReturnType,
  decodeResult,
  createGist,
  deleteGist,
  FulfillmentCode,
} = require("@chainlink/functions-toolkit");
const { abi: functionsConsumerAbi } = require("../artifacts/contracts/Lendex.sol/Lendex.json");
const ethers = require("ethers");
// require("@chainlink/env-enc").config();
require('dotenv').config();

const consumerAddress = process.env.CHAINLINK_CONSUMER_ADDRESS; // REPLACE this with your Functions consumer address
const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID; // your Chain-Link functions subscription ID

const makeOracleRequest = async () => {
  const routerAddress = process.env.CHAINLINK_FUNCTIONS_ROUTER;
  const linkTokenAddress = process.env.CHAINLINK_TOKEN_ADDRESS;
  const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
  const lenderAddress = process.env.CARDANO_LENDER_ADDRESS;
  const donId = process.env.CHAINLINK_DON_ID;
  const explorerUrl = "https://sepolia.etherscan.io";

  // Initialize functions settings
  const source = fs
    .readFileSync(path.resolve(__dirname, "source.js"))
    .toString();
  
  const tokenId = 1;
  const args = ["borrow_check", tokenId.toString()];
  const secrets = { apiKey: process.env.BLOCKFROST_API_KEY  };
  const gasLimit = 300000;

  // Initialize ethers signer and provider to interact with the contracts onchain
  const privateKey = process.env.PRIVATE_KEY; // fetch PRIVATE_KEY
  if (!privateKey)
    throw new Error(
      "private key not provided - check your environment variables"
    );

  const otherPrivateKey = process.env.OTHER_PRIVATE_KEY; // fetch PRIVATE_KEY
  if (!otherPrivateKey)
    throw new Error(
      "lender private key not provided - check your environment variables"
    );

  const rpcUrl = process.env.PROVIDER_RPC_URL; // fetch mumbai RPC URL

  if (!rpcUrl)
    throw new Error(`rpcUrl not provided  - check your environment variables`);

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const signer = new ethers.Wallet(privateKey, provider);
  const lender = new ethers.Wallet(otherPrivateKey, provider);

  ///////// START SIMULATION ////////////

  console.log("Start simulation...");

  const response = await simulateScript({
    source: source,
    args: args,
    bytesArgs: [], // bytesArgs - arguments can be encoded off-chain to bytes.
    secrets: secrets,
  });

  console.log("Simulation result", response);
  const errorString = response.errorString;
  if (errorString) {
    console.log(`❌ Error during simulation: `, errorString);
  } else {
    const responseBytesHexstring = response.responseBytesHexstring;
    if (ethers.utils.arrayify(responseBytesHexstring).length > 0) {
      const decodedResponse = ethers.utils.defaultAbiCoder.decode(
        ["string", "int", "int", "int"],
        response.responseBytesHexstring,
      );
      console.log(`✅ Decoded response: ${decodedResponse}` );
    }
  }

  //////// ESTIMATE REQUEST COSTS ////////
  console.log("\nEstimate function request costs...");
  // Initialize and return SubscriptionManager
  const subscriptionManager = new SubscriptionManager({
    signer: signer,
    linkTokenAddress: linkTokenAddress,
    functionsRouterAddress: routerAddress,
  });
  await subscriptionManager.initialize();

  // estimate costs in Juels

  const gasPriceWei = await signer.getGasPrice(); // get gasPrice in wei

  const estimatedCostInJuels =
    await subscriptionManager.estimateFunctionsRequestCost({
      donId: donId, // ID of the DON to which the Functions request will be sent
      subscriptionId: subscriptionId, // Subscription ID
      callbackGasLimit: gasLimit, // Total gas used by the consumer contract's callback
      gasPriceWei: BigInt(gasPriceWei), // Gas price in gWei
    });

  console.log(
    `Fulfillment function cost estimated to ${ethers.utils.formatEther(
      estimatedCostInJuels
    )} LINK`
  );

  //////// MAKE REQUEST ////////

  console.log("\nMake request...");

  // First encrypt secrets and create a gist
  const secretsManager = new SecretsManager({
    signer: signer,
    functionsRouterAddress: routerAddress,
    donId: donId,
  });
  await secretsManager.initialize();

  // Encrypt secrets
  const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

  // Upload secrets
  const gatewayUrls = JSON.parse(process.env.CHAINLINK_ENCRYPTED_SECRETS_UPLOAD_ENDPOINTS);
  const slotIdNumber = 0; // slot ID where to upload the secrets
  const expirationTimeMinutes = 15; // expiration time in minutes of the secrets
  console.log(
    `Upload encrypted secret to gateways ${gatewayUrls}. slotId ${slotIdNumber}. Expiration in minutes: ${expirationTimeMinutes}`
  );
  const uploadResult = await secretsManager.uploadEncryptedSecretsToDON({
    encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
    gatewayUrls: gatewayUrls,
    slotId: slotIdNumber,
    minutesUntilExpiration: expirationTimeMinutes,
  });

  if (!uploadResult.success)
    throw new Error(`Encrypted secrets not uploaded to ${gatewayUrls}`);

  console.log(
    `\n✅ Secrets uploaded properly to gateways ${gatewayUrls}! Gateways response: `,
    uploadResult
  );

  const donHostedSecretsVersion = parseInt(uploadResult.version); // fetch the reference of the encrypted secrets

  const functionsConsumer = new ethers.Contract(
    consumerAddress,
    functionsConsumerAbi,
    lender
  );


  // Actual transaction call
  const transaction = await functionsConsumer.borrowToken(
    source,
    contractAddress,
    tokenId,
    lenderAddress,
    slotIdNumber,
    donHostedSecretsVersion
    // encryptedSecretsUrls, // Encrypted Urls where the DON can fetch the encrypted secrets
    // 0, // don hosted secrets - slot ID - empty in this example
    // 0, // don hosted secrets - version - empty in this example
    // "0x", // user hosted secrets - encryptedSecretsUrls - empty in this example
    // slotIdNumber, // slot ID of the encrypted secrets
    // donHostedSecretsVersion, // version of the encrypted secrets
    // args, // args
    // [], // bytesArgs - arguments can be encoded off-chain to bytes.
    // gasLimit,
    // ethers.utils.formatBytes32String(donId) // jobId is bytes32 representation of donId
  );

  // Log transaction details
  console.log(
    `\n✅ Functions request sent! Transaction hash ${transaction.hash}. Waiting for a response...`
  );

  console.log(
    `See your request in the explorer ${explorerUrl}/tx/${transaction.hash}`
  );

  const responseListener = new ResponseListener({
    provider: provider,
    functionsRouterAddress: routerAddress,
  }); // Instantiate a ResponseListener object to wait for fulfillment.
  (async () => {
    try {
      const response = await new Promise((resolve, reject) => {
        responseListener
          .listenForResponseFromTransaction(transaction.hash)
          .then((response) => {
            resolve(response); // Resolves once the request has been fulfilled.
          })
          .catch((error) => {
            reject(error); // Indicate that an error occurred while waiting for fulfillment.
          });
      });

      const fulfillmentCode = response.fulfillmentCode;

      if (fulfillmentCode === FulfillmentCode.FULFILLED) {
        console.log(
          `\n✅ Request ${
            response.requestId
          } successfully fulfilled. Cost is ${ethers.utils.formatEther(
            response.totalCostInJuels
          )} LINK.Complete reponse: `,
          response
        );
      } else if (fulfillmentCode === FulfillmentCode.USER_CALLBACK_ERROR) {
        console.log(
          `\n⚠️ Request ${
            response.requestId
          } fulfilled. However, the consumer contract callback failed. Cost is ${ethers.utils.formatEther(
            response.totalCostInJuels
          )} LINK.Complete reponse: `,
          response
        );
      } else {
        console.log(
          `\n❌ Request ${
            response.requestId
          } not fulfilled. Code: ${fulfillmentCode}. Cost is ${ethers.utils.formatEther(
            response.totalCostInJuels
          )} LINK.Complete reponse: `,
          response
        );
      }

      const errorString = response.errorString;
      if (errorString) {
        console.log(`\n❌ Error during the execution: `, errorString);
      } else {
        const responseBytesHexstring = response.responseBytesHexstring;
        if (ethers.utils.arrayify(responseBytesHexstring).length > 0) {
          const decodedResponse = decodeResult(
            response.responseBytesHexstring,
            ReturnType.bytes
          );
          console.log(
            `\n✅ Response to `, ethers.utils.defaultAbiCoder.decode(
              ["string", "int", "int", "int"],
            decodedResponse)
          );

          // Delete gistURL - not needed anymore
          // console.log(`Delete gistUrl ${gistURL}`);
          // await deleteGist(githubApiToken, gistURL);
          // console.log(`\n✅ Gist ${gistURL} deleted`);
        }
      }
    } catch (error) {
      console.error("Error listening for response:", error);
    }
  })();
};

makeOracleRequest().catch((e) => {
  console.error(e);
  process.exit(1);
});
