# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

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