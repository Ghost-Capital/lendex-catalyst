import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';

dotenv.config();

async function main() {
  // const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  // const unlockTime = currentTimestampInSeconds + 60;

  // const lockedAmount = ethers.parseEther("0.001");

  // const lock = await ethers.deployContract("Lock", [unlockTime], {
  //   value: lockedAmount,
  // });

  // await lock.waitForDeployment();

  // Initialize ethers signer and provider to interact with the contracts onchain
  const privateKey = process.env.PRIVATE_KEY; // fetch PRIVATE_KEY
  if (!privateKey)
    throw new Error(
      "private key not provided - check your environment variables"
    );

  const rpcUrl = process.env.PROVIDER_RPC_URL; // fetch RPC URL

  if (!rpcUrl)
    throw new Error(`rpcUrl not provided  - check your environment variables`);

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const signer = new ethers.Wallet(privateKey, provider);

  const { abi: contractAbi, bytecode: contractByteCode } = require("../artifacts/contracts/Lendex.sol/Lendex.json");
  const factory = new ethers.ContractFactory(contractAbi, contractByteCode, signer);

  // Contract params
  const router = process.env.CHAINLINK_FUNCTIONS_ROUTER;
  const source = fs.readFileSync(path.resolve(__dirname, "source.js")).toString('utf-8');
  const subscriptionId = Number(process.env.CHAINLINK_SUBSCRIPTION_ID);
  const donID = ethers.utils.formatBytes32String(process.env.CHAINLINK_DON_ID);
  const contractPolicyId = process.env.CARDANO_POLICY_ID;
  const contractAddress = process.env.CARDANO_CONTRACT_ADDRESS;
  const apiUrl = process.env.BLOCKFROST_BLOCKCHAIN_URL;

  // Encode the source string
  const encodedSource = ethers.utils.solidityPack(['string'], [source]);

  // Calculate the keccak256 hash
  const hash = ethers.utils.keccak256(encodedSource);

  console.log(hash);

  // If your contract requires constructor args, you can specify them here
  // address router, 
  // string memory source, 
  // uint64 subscriptionId,
  // bytes32 donID,
  // string memory contractAddress
  const contract = await factory.deploy(
    router, 
    hash, 
    subscriptionId, 
    donID, 
    // , {
    //   gasLimit: ethers.utils.hexlify(500000)
    // }
  );

  console.log('Contract address:', (contract.target || contract.address));
  console.log('Contract tx:', contract.deployTransaction);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
