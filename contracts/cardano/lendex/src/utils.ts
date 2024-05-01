import { Lucid, MintingPolicy, SpendingValidator, applyParamsToScript, applyDoubleCborEncoding, Data } from "https://deno.land/x/lucid@0.10.7/mod.ts";
import blueprint from "../plutus.json" assert { type: "json" };

export type Validators = {
  pay: SpendingValidator;
  borrow: MintingPolicy;
};

export function readValidators(): Validators {
  const pay = blueprint.validators.find((v) => v.title === "lendex.pay");

  if (!pay) {
    throw new Error("Pay validator not found");
  }

  const borrow = blueprint.validators.find((v) => v.title === "lendex.borrow");

  if (!borrow) {
    throw new Error("Mint validator not found");
  }

  return {
    pay: {
      type: "PlutusV2",
      script: pay.compiledCode,
    },
    borrow: {
      type: "PlutusV2",
      script: borrow.compiledCode,
    },
  };
}

export type AppliedValidators = {
  borrow: MintingPolicy;
  pay: SpendingValidator;
  policyId: string;
  lockAddress: string;
};

const CredentialSchema = Data.Enum([
  Data.Object({ VerificationKeyCredential: Data.Tuple([Data.Bytes({ minLength: 28, maxLength: 28 })]) }),
  Data.Object({ ScriptCredential: Data.Tuple([Data.Bytes({ minLength: 28, maxLength: 28 })]) }),
]);
export type Credential = Data.Static<typeof CredentialSchema>;
export const Credential = CredentialSchema as unknown as Credential;

const MintSchema = Data.Object({
  script: CredentialSchema,
  nonce: Data.Bytes()
});
type Mint = Data.Static<typeof MintSchema>;
const Mint = MintSchema as unknown as Mint;

const RedeemerDataSchema = Data.Enum([
  Data.Literal("Borrow"),
  Data.Literal("Pay")
]);
export type RedeemerData = Data.Static<typeof RedeemerDataSchema>;
export const RedeemerData = RedeemerDataSchema as unknown as RedeemerData;

const FeeSchema = Data.Object({
    n: Data.Integer(),
    d: Data.Integer()
});
export type Fee = Data.Static<typeof FeeSchema>;
export const Fee = FeeSchema as unknown as Fee;

const DatumDataSchema = Data.Object({
    lender: Data.Bytes(),
    borrower: Data.Bytes(),
    amount: Data.Integer(),
    deadline: Data.Integer(),
    fee: FeeSchema,
});
export type DatumData = Data.Static<typeof DatumDataSchema>;
export const DatumData = DatumDataSchema as unknown as DatumData;

export function applyParams(
  mint_script: string,
  redeem_script: string,
  lucid: Lucid,
  nonce: string
): AppliedValidators {

  const pay: SpendingValidator = {
    type: "PlutusV2",
    script: applyDoubleCborEncoding(redeem_script)
  };
  const lockAddress = lucid.utils.validatorToAddress(pay);
  const scriptHash = lucid.utils.validatorToScriptHash(pay);
  const credential: Credential = { ScriptCredential: [scriptHash] };

  const mintParams = Data.from(Data.to({
    script: credential,
    nonce: nonce
  }, Mint));

//   console.log('Params:', mintParams);
  

  const borrow: MintingPolicy = {
    type: "PlutusV2",
    script: applyDoubleCborEncoding(applyParamsToScript(mint_script,
      [
        mintParams
      ]
    ))
  };

  const policyId = lucid.utils.validatorToScriptHash(borrow);

  return {
    borrow,
    pay,
    policyId,
    lockAddress
  };
}

export function randomNonce(s = 32): string {
  if (s % 2 == 1) {
    throw new Deno.errors.InvalidData("Only even sizes are supported");
  }
  const buf = new Uint8Array(s / 2);
  crypto.getRandomValues(buf);
  let nonce = "";
  for (let i = 0; i < buf.length; ++i) {
    nonce += ("0" + buf[i].toString(16)).slice(-2);
  }
  console.log('Nonce:', nonce);
  return nonce;
}