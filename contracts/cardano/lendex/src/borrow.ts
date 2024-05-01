import { applyParams, readValidators, RedeemerData, DatumData, Fee, Credential } from "./utils.ts";
import {
    Blockfrost,
    Data,
    Lucid,
    SpendingValidator,
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
const lender = lucid.utils.getAddressDetails(await Deno.readTextFile("./lender.addr")).paymentCredential!.hash;
const borrowerAddr = await Deno.readTextFile("./borrower.addr");
const borrower = lucid.utils.getAddressDetails(borrowerAddr).paymentCredential!.hash;

console.log('Lender', lender, borrower);
console.log('Borrower', borrowerAddr, borrower);


const validators = readValidators();

const nonce = fromText("Lendex");
const { borrow, pay, policyId, lockAddress } = applyParams(validators.borrow.script, validators.pay.script, lucid, nonce);

const utxos = await lucid?.wallet.getUtxos()!;
console.log('UTXOS:', utxos);
console.log('PolicyId:', policyId);
console.log('Script Address:', lockAddress);

const utxo = utxos[0];

const lovelace = 1_000_000;
const tokenName = 'Lendex#001';
const assetName = `${policyId}${fromText(tokenName)}`;

// const mintRedeemer = Data.to(new Constr(0, [msg]));
const minter: RedeemerData = "Borrow";
const mintRedeemer = Data.to(minter, RedeemerData);
console.log('Redeemer:', mintRedeemer);

const fee: Fee = {
    n: 1n,
    d: 2n
}

const d: DatumData = {
    lender,
    borrower,
    amount: 1000000n,
    deadline: BigInt(Date.now() + (60 * 60 * 24 * 365)),
    fee
}

const datum = Data.to(d, DatumData);
console.log('Datum', datum);

const validTo = Date.now() + (60 * 60 * 1000);
const tx = await lucid
    .newTx()
    .collectFrom([utxo])
    // use the mint validator
    .attachMintingPolicy(borrow)
    // mint 1 of the asset
    .mintAssets(
        { [assetName]: BigInt(1) },
        // this redeemer is the first argument
        mintRedeemer
    )
    .payToContract(
        lockAddress,
        {
            inline: datum,
        },
        {
            lovelace: BigInt(lovelace),
            [assetName]: BigInt(1)
        }
    )
    .payToAddress(borrowerAddr, {
        lovelace: d.amount
    })
    .validTo(validTo)
    // .addSignerKey(signerKey)
    .complete();
const txSigned = await tx.sign().complete();
console.log(txSigned.toString());

const txHash = await txSigned.submit();
console.log('Tx Id:', txHash);
const success = await lucid.awaitTx(txHash);
console.log('Success?', success);