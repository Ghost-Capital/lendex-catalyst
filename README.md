# Lendex Open-source lending protocol

This project contains the source code for Lendex protocol to work for users interested on borrowing from Cardano (only ADA for now) providing an NFT as a collateral from an EVM based blockchain. It comes with both EVM and Cardano contract for the protocol itself along with a set of scripts that deploys and test the contracts.

## How the lending protocol works

### 1. Borrow token

**First action**: A user on EVM wants to borrow ADA, and use their Token (NFT) as collateral. They set their borrow amount, deadline and repayment terms (APY).
The EVM user can then send their token to the EVM smart contract awaiting a lender from Cardano to accept.

**Secod action**: No one has accepted the deal and Borrower (EVM user) decide to remove the offer. This action efectively send the token back to the original EVM smart contract making the borrower his owner again.

**Third action**: If a user on Cardano decides to accept the deal, they will be able to mint a token on the Cardano smart contract meaning they accept the offer. That token will be the proof the EVM Oracle will use in order to guarantee lender in fact have accepted the agreement and therefore paid the asking amount to the Borrower.

**Fourth action**: Once the Cardano user has done this, with their EVM account they are able to call the EVM ```borrowToken``` function, this will update the status from locked to waiting for payment.

Chainlink is used as Oracle to check that the token has been minted (with all required data according to borrower specification e.g amount, fee, deadline etc) on Cardano in order to update the token in the EVM smart contract.

Now, the EVM Borrower is not allowed to withdraw their NFT unless they pay for the debt.

### 2. Pay token debt

**First action**: In order to pay back the debt, the EVM borrower will submit a transaction on Cardano. The transaction will contain outputs of: Paying the Lender the ADA debt (including fees), and burning the NFT in the smart contract. The contract will only allow the token to be burnt if the transaction includes the payment to Lender.

**Second action**: After that, the chainlink oracle is able to check that the token has been burnt. If so it will update the EVM token in the contract.

### 3. Claim token

**First actio**n: Claim token is then callable by the the EVM Borrower in order to claim their NFT back.

**Second action**: In a case of a default (no debt paid), if the time is past the expiry time on the contract locking terms, the Lender (Cardano user) is able to use their EVM account to claim the token for themselves.

## How to use the protocol

### Requirements:
In order to test the protocol you'll need two different Ethereum testnet (Sepolia) accounts with enough funds to deploy contracts and submit some transactions. You can get access to some funds using any of the different faucet options Ethereum ecosystem provides. 
Also at least 25 Ethereum testnet `LINK` token will also be needed as part of the costs to interact with Chainlink Oracle.
Here is a compacted list of some of those options:

1. https://faucets.chain.link/sepolia
2. https://cloud.google.com/application/web3/faucet/ethereum/sepolia
3. https://www.infura.io/faucet/sepolia
4. https://www.alchemy.com/faucets/ethereum-sepolia

> [!NOTE]
> Some of the link above will require you to have a EVM mainnet account with a minimum of funds available.


This repo provides a set of scripts as an easy way to interact and test the protocol. You'll need a .env file in order to store the required variables. Use this as a guide to make sure all necessary protocol requirements are setup.

```
PRIVATE_KEY="..." # EVM wallet private key
OTHER_PRIVATE_KEY="..." # EVM wallet private key
PROVIDER_RPC_URL="..."
PROVIDER_API_KEY="..."
BLOCKFROST_API_KEY="..."
BLOCKFROST_BLOCKCHAIN_URL="https://cardano-preview.blockfrost.io/api/v0"
CHAINLINK_FUNCTIONS_ROUTER="0xb83E47C2bC239B3bf370bc41e1459A34b41238D0" # Sepolia testnet
CHAINLINK_TOKEN_ADDRESS="0x779877A7B0D9E8603169DdbD7836e478b4624789" # Sepolia testnet
CHAINLINK_CONSUMER_ADDRESS="..."
CHAINLINK_ENCRYPTED_SECRETS_UPLOAD_ENDPOINTS=["https://01.functions-gateway.testnet.chain.link/", "https://02.functions-gateway.testnet.chain.link/"]
CHAINLINK_SUBSCRIPTION_ID=...
CHAINLINK_DON_ID="fun-ethereum-sepolia-1"
CHAINLINK_SOURCE_HASH="0xdfb48d5110e0aef68f9254bf6cb639929002a0866165913d8cc0e24df4859a3e"
CARDANO_BORROWER_ADDRESS="..." # Cardano address payment credential hash
CARDANO_LENDER_ADDRESS="..." # Cardano address payment credential hash
CARDANO_POLICY_ID="eef2d298b856d433d01b83b5b2a4318767845589bee6fecc890c8655" # don't need to touch it unless you change the Cardano SCs
CARDANO_CONTRACT_ADDRESS="addr_test1wrt2zjjdqfaulpcmnv6gwzavpaajjgsxfklk3zmjnx3y30qz42a4w" # don't need to touch it unless you change the Cardano SCs
CONTRACT_ADDRESS="..." # Lendex EVM Contract
NFT_CONTRACT_ADDRESS="..." # DUMMY EVM NFT Contract
```

`PRIVATE_KEY` and `OTHER_PRIVATE_KEY` are the private keys of the two different EVM accounts mentioned above. Refer to this guide is you want to know how to get access to those keys from [metamask](https://support.metamask.io/ko/managing-my-wallet/secret-recovery-phrase-and-private-keys/how-to-export-an-accounts-private-key/). 

`PROVIDER_RPC_URL` and `PROVIDER_API_KEY` are EVM API provider credentiales you'll need to get access to the blockchain. You can use any provider out there supporting Ethereum Sepolia testnet such as: Infura, or Alchemy.

`BLOCKFROST_BLOCKCHAIN_URL` and `BLOCKFROST_API_KEY` are exactly the same as the credential explained above but for Cardano preview testnet.

All variables starting with `CHAINLINK_` are refereing to data necessary to interact with Chainlink Oracle. You'll need to create a Chainlink subscription and a consumer function (this will allow Lendex contract to call the oracle). Information no provided (filled with `...`) must change according to your setup like: `CHAINLINK_CONSUMER_ADDRESS`, `CHAINLINK_SUBSCRIPTION_ID`.

Same way all variables starting with `CARDANO_` are corresponding to Cardano data. `CARDANO_BORROWER_ADDRESS` and `CARDANO_LENDER_ADDRESS` are the Cardano accounts for both Lender and Borrower user. You can add Preview testnet funds using this [link](https://docs.cardano.org/cardano-testnets/tools/faucet/) (make sure `Preview Testnet` is selected). `CARDANO_POLICY_ID` and `CARDANO_CONTRACT_ADDRESS` correspond to the minting smart contract hash and spending smart contract address respectively.

Finally `CONTRACT_ADDRESS` and `NFT_CONTRACT_ADDRESS` are variables for Lendex EVM contract and an auxiliary NFT contract for testing purposes.

## Testing the protocol

Run the following tasks:
### Compile the smart contracts (Optional)

```shell
npx hardhat compile

```

### Deploy Contracts (Optional)

We use a contract in order to test EVM users having NFT's to interact with the protocol. To depoy such contract just run this command:
```shell
npx hardhat run scripts/deploy-test-nft.ts
```
After the NFT contract is deployed we need to mint some NFTs in order to use then later. There is a script just for that you can call passing the token Id as env variable (if no env variable is present it'll mint `tokenId = 1`). Here is the command:

```shell
npx hardhat run scripts/mint-test-nft.ts
```

To deploy lendex contract, run this command:
```shell
npx hardhat run scripts/deploy-lendex.ts
```

>Ouput
```shell
...
Chainlink source hash: 0xdfb48d5110e0aef68f9254bf6cb639929002a0866165913d8cc0e24df4859a3e
Contract address: 0x3016016f41198d467B275D74cf67AF02cACbDF78
...
```

> [!IMPORTANT]
> Grab Lendex contract address, it'll be needed to add a consumer to chainlink.

Once the Lendex protocol contract is deployed we can start borrwing and lending throughout Lendex

### Lock NFT for borrowing

```shell
npx hardhat run scripts/lendex-lock-nft.ts
```

> [!IMPORTANT]
> Remember you need to mint any NFT you'll make reference here. You can pass env variable `tokenId={tokenId} npx hardhat run scripts/lendex-lock-nft.ts` to specify the token to lock in lendex's contract

### Lender accept the offer
Remember that accepting the offer means minting a Cardano NFT. Remember token must have same information as the NFT counterpart like `amount` and `tokenId` which are avaible through env variables when running the command bellow:
```shell
node contracts/cardano/lendex/src/borrow.ts
```

Once the NFT have been minted on Cardano, you can notify Lendex EVM contract calling `borrowToken` function. Following command do exactly that:

```shell
npx hardhat run scripts/lendex-borrow-nft.js
```

> [!WARNING]
> Remember you can pass `tokenId` as env variable to specify which token is the indicated. `NFT_CONTRACT_ADDRESS` will be use as the token's collection reference.

### Borrower pay debt back
Paying the debt means borrower will pay to lender on Cardano the specific amount of ADA specified in the offer (amount requested plus fees) and burnt the Cardano NFT at the same time (same transaction). You can run command:
```shell
node contracts/cardano/lendex/src/pay.ts
```
> [!IMPORTANT]
> This script relys on the UTxO holding the Cardano NFT. In order to find it you can use Blockfrost API's endpoints to first get the initial minting transaction hash, and then the `datum` and ADA value for the token on that transaction UTxO

```shell
curl --location 'https://cardano-preview.blockfrost.io/api/v0/assets/eef2d298b856d433d01b83b5b2a4318767845589bee6fecc890c86554c656e6465782331' \
--header 'project_id: preview...'
```
> Output
```json
{
    "asset": "eef2d298b856d433d01b83b5b2a4318767845589bee6fecc890c86554c656e6465782331",
    "policy_id": "eef2d298b856d433d01b83b5b2a4318767845589bee6fecc890c8655",
    "asset_name": "4c656e6465782331",
    "fingerprint": "asset1yf4wcqgkl6l2arw6m6479kps39qh49aqddg9vq",
    "quantity": "1",
    "initial_mint_tx_hash": "e8999b77791de23a83f07ee193f1111acdbccf25b41a5a7ec8fd91f0e807973e",
    "mint_or_burn_count": 1,
    "onchain_metadata": null,
    "onchain_metadata_standard": null,
    "onchain_metadata_extra": null,
    "metadata": null
}
```

Grab `initial_mint_tx_hash` and access to the tx UTxOs
```shell
curl --location 'https://cardano-preview.blockfrost.io/api/v0/txs/e8999b77791de23a83f07ee193f1111acdbccf25b41a5a7ec8fd91f0e807973e/utxos' \
--header 'project_id: preview...'
```
> Output (we need the `txHash`, the `amount` of lovelace and `datum` data)
```json
{
    "hash": "e8999b77791de23a83f07ee193f1111acdbccf25b41a5a7ec8fd91f0e807973e",
    "inputs": [...],
    "outputs": [
       ...
       {
            "address": "addr_test1wrt2zjjdqfaulpcmnv6gwzavpaajjgsxfklk3zmjnx3y30qz42a4w",
            "amount": [
                {
                    "unit": "lovelace",
                    "quantity": "1435230"
                },
                {
                    "unit": "eef2d298b856d433d01b83b5b2a4318767845589bee6fecc890c86554c656e6465782331",
                    "quantity": "1"
                }
            ],
            "output_index": 0,
            "data_hash": "52c4ab0473fcdfd0be737be7e8f688221187f07a70ee9b535558b222d37be49f",
            "inline_datum": "d8799f581c3dce7844f36b23b8c3f90afba40aa188e7f1d3f6e8acd1d544ed1da9581c3afa0ec5eb5349b65248e1700844c01c0698355d2a1f1917dcfc977b1a000f42401b0000018f3470311fd8799f0102ffff",
            "collateral": false,
            "reference_script_hash": null
        },
       ...
    ]
}
```

Here is an example:
```shell
txHash=e8999b77791de23a83f07ee193f1111acdbccf25b41a5a7ec8fd91f0e807973e amount=1435230 datum=d8799f581c3dce7844f36b23b8c3f90afba40aa188e7f1d3f6e8acd1d544ed1da9581c3afa0ec5eb5349b65248e1700844c01c0698355d2a1f1917dcfc977b1a000f42401b0000018f3470311fd8799f0102ffff node contracts/cardano/lendex/src/pay.ts
```

Once the Cardano NFT was succefully burnt, Borrower can call `payTokenDebt` in Lendex EVM contract so token status is changed upon Oracle verification.

```shell
npx hardhat run scripts/lendex-pay-debt-nft.js
```
> [!IMPORTANT]
> Use `tokenId` to specify token been claimed


Finally Borrower can claim the EVM NFT back using this command:
```shell
npx hardhat run scripts/lendex-lender-claim-locked-nft.ts
```
> [!IMPORTANT]
> Use `tokenId` to specify token been claimed

After that, the NFT will be sent back to original contract with borrower as the owner.
