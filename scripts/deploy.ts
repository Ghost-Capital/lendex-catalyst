import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  const unlockTime = currentTimestampInSeconds + 60;

  const lockedAmount = ethers.parseEther("0.001");

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

  const rpcUrl = process.env.POLYGON_MUMBAI_RPC_URL; // fetch mumbai RPC URL

  if (!rpcUrl)
    throw new Error(`rpcUrl not provided  - check your environment variables`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const signer = new ethers.Wallet(privateKey, provider);

  const { abi: contractAbi, bytecode: contractByteCode } = require("../artifacts/contracts/Lendex.sol/FunctionsConsumerExample.json");
  // const routerAddress = "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C";

  const factory = new ethers.ContractFactory(contractAbi, contractByteCode, signer);

  // If your contract requires constructor args, you can specify them here
  const contract = await factory.deploy();

  console.log('Contract address:', contract.target);
  console.log('Contract tx:', contract.deploymentTransaction);

  const coin = "MATIC"; // or ETH etc
  // console.log(
  //   `Lock with ${ethers.utils.formatEther(
  //     lockedAmount
  //   )}${coin} and unlock timestamp ${unlockTime} deployed to ${lock.target}`
  // );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
