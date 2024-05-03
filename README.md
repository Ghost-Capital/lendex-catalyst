# Lendex Open-source lending protocol

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Run the following tasks:

```shell
# npx hardhat help
# npx hardhat test
# REPORT_GAS=true npx hardhat test
# npx hardhat node
npx hardhat compile

```

Deploy Contract
```shell
npx hardhat run scripts/deploy.ts
```
>Ouput
```shell
...
Contract address: 0x3016016f41198d467B275D74cf67AF02cACbDF78
...
```

Grab contract address, it'll be needed to add a consumer to chainlink

## Request to oracle
```shell
npx hardhat run scripts/request.js
```

## How the lending protocol works

### 1. Borrow token

First action: A user on EVM wants to borrow ADA, and use their Token (NFT) as collateral. They set their borrow amount and repayment terms (APY).
The EVM user can then send their token to the EVM smart contract awaiting a lender to accept.

Second action: If a user on Cardano decides to accept the deal, they mint will be able to mint a token on the Cardano smart contract. This means they accept the deal.

Third action: Once the Cardano user has done this, with their EVM account they are able to call the ```borrowToken``` function, this will update the status from locked to waiting for payment.

Chainlink is used to check that the token has been minted on Cardano in order to update the token in the EVM smart contract.

Now, the EVM borrower is not allowed to withdraw their NFT unless they pay for the debt.

### 2. Pay token debt

First action: In order to pay back the debt, the EVM borrower will submit a transaction on Cardano. The transaction will contain outputs of: Paying the Lender the ADA debt, and burning the NFT in the smart contract. The contract will only allow the token to be burnt if the payment UTxOs are also included in the transaction outputs.

Second action: After that, the chainlink oracle is able to check that the token has been burnt. If so it will update the EVM token in the contract.

### 3. Claim token

First action: Claim token is then callable by the the EVM borrower in order to claim their second back.

Second action: In a case of a default (no debt paid), if the time is past the expiry time on the contract locking terms, the Cardano user is able to use their EVM account to claim the token for themselves.


