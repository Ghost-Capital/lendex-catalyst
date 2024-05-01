import { applyParams, readValidators, RedeemerData, DatumData, Fee, Credential } from "./utils.ts";
import {
    Blockfrost,
    Data,
    Lucid,
    SpendingValidator,
    UTxO,
    applyDoubleCborEncoding,
    fromText,
    getAddressDetails,
} from "https://deno.land/x/lucid@0.10.7/mod.ts";
import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

const env = await load();

const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        env["BLOCKFROST_PROJECT_ID"]
    ),
    "Preview"
);

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./lender.sk"));
const lenderAddr = await Deno.readTextFile("./lender.addr");
const lender = lucid.utils.getAddressDetails(lenderAddr).paymentCredential!.hash;
const borrowerAddr = await Deno.readTextFile("./borrower.addr");
const borrower = lucid.utils.getAddressDetails(borrowerAddr).paymentCredential!.hash;

console.log('Lender', lenderAddr, lender);
console.log('Borrower', borrowerAddr, borrower);


const validators = readValidators();

const nonce = fromText("Lendex");
const { borrow, pay, policyId, lockAddress } = applyParams(validators.borrow.script, validators.pay.script, lucid, nonce);

const utxos = await lucid?.wallet.getUtxos()!;
console.log('UTXOS:', utxos);
console.log('PolicyId:', policyId);
console.log('Script Address:', lockAddress);

const utxo = utxos[0];

const fee = 1/2

const amount = BigInt(Math.ceil(1_000_000 + (1_000_000 * fee)));
const tokenName = 'Lendex#001';
const assetName = `${policyId}${fromText(tokenName)}`;

const minter: RedeemerData = "Pay";
const redeemer = Data.to(minter, RedeemerData);


const tokenUtxo: UTxO = {
    address: lockAddress,
    txHash: "c20f28e0ce141e9c6b98a8dd872c67d5da0b5e6039df91ecde2ffc6e9299ca56",
    outputIndex: 0,
    assets: { lovelace: BigInt(1443850), [assetName]: BigInt(1) },
    datum: "d8799f581c3dce7844f36b23b8c3f90afba40aa188e7f1d3f6e8acd1d544ed1da9581c3afa0ec5eb5349b65248e1700844c01c0698355d2a1f1917dcfc977b1a000f42401b0000018f345e9b8bd8799f0102ffff"
}


const validTo = Date.now() + (60 * 60 * 1000);
const tx = await lucid
    .newTx()
    .collectFrom([utxo, tokenUtxo], redeemer)
    // use the mint validator
    .attachMintingPolicy(borrow)
    // burn 1 of the asset
    .mintAssets(
        { [assetName]: BigInt(-1) },
        // this redeemer is the first argument
        redeemer
    )
    .payToAddress(lenderAddr, {
        lovelace: amount
    })
    .attachSpendingValidator(pay)
    // .addSignerKey(signerKey)
    .validTo(validTo)
    .complete();
const txSigned = await tx.sign().complete();
console.log(txSigned.toString());

const txHash = await txSigned.submit();
console.log('Tx Id:', txHash);
const success = await lucid.awaitTx(txHash);
console.log('Success?', success);
