import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';

dotenv.config();

async function main() {
  // Initialize ethers signer and provider to interact with the contracts onchain
  const privateKey = process.env.PRIVATE_KEY; // fetch PRIVATE_KEY
  const lendexContractAddress = process.env.CONTRACT_ADDRESS;
  const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
  if (!privateKey)
    throw new Error(
      "private key not provided - check your environment variables"
    );

  const rpcUrl = process.env.PROVIDER_RPC_URL; // fetch RPC URL

  if (!rpcUrl)
    throw new Error(`rpcUrl not provided  - check your environment variables`);

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const signer = new ethers.Wallet(privateKey, provider);
  const { abi: contractAbi } = require("../artifacts/contracts/Lendex.sol/Lendex.json");

  const contract = new ethers.Contract(lendexContractAddress, contractAbi, signer);
  
  const tokenId = process.env.tokenId ? Number(process.env.tokenId) : 1;
  
  console.log('Claim Token:', tokenId);
  // const owner = await signer.getAddress();
  const info = await contract.connect(signer).claimToken(contractAddress, tokenId);
  // const info = await contract.getSourceHash();
  console.log(`Token: ${tokenId} Info ${info}`);

  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});