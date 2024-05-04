import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';

dotenv.config();

async function main() {
  // Initialize ethers signer and provider to interact with the contracts onchain
  const privateKey = process.env.PRIVATE_KEY; // fetch PRIVATE_KEY
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
  const { abi: contractAbi } = require("../artifacts/contracts/NFT.sol/NFT.json");

  const contract = new ethers.Contract(contractAddress, contractAbi, signer);
  
  const tokenId = process.env.tokenId ? Number(process.env.tokenId) : 1;
  
  console.log('Lock Token:', tokenId);
  const borrower = await signer.getAddress();
  const lendex = process.env.CONTRACT_ADDRESS;
  const borrowerAddr = process.env.CARDANO_BORROWER_ADDRESS;
  const deadline = 604800;
  const amount = 1000000;
  const fee_n = 1;
  const fee_d = 2;

  const data = new ethers.utils.AbiCoder().encode(["string", "uint256", "int", "string", "int", "int"], [borrowerAddr, deadline, amount, "ADA", fee_n, fee_d]);
  const tx = await contract.connect(signer)["safeTransferFrom(address,address,uint256,bytes)"](borrower, lendex, tokenId, data);
  console.log('Mint tx:', tx);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});