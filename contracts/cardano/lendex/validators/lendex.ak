use aiken/bytearray.{is_empty}
use aiken/cbor
use aiken/dict
use aiken/hash.{Blake2b_224, Hash}
use aiken/interval
use aiken/list
use aiken/math/rational
use aiken/time.{PosixTime}
use aiken/transaction.{
  DatumHash, InlineDatum, Output, ScriptContext, Spend, Transaction,
  ValidityRange, find_datum, find_input,
} as tx
use aiken/transaction/credential.{
  Address, Credential, ScriptCredential, VerificationKey,
  VerificationKeyCredential,
}
use aiken/transaction/value.{is_zero, lovelace_of, without_lovelace}

type MintParams {
  script: Credential,
  // random value to generate different policy when policy and credentails are the same
  nonce: ByteArray,
}

type RedeemerData {
  Borrow
  Pay
}

type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

type Fee {
  n: Int,
  d: Int,
}

type DatumData {
  lender: VerificationKeyHash,
  borrower: VerificationKeyHash,
  amount: Int,
  deadline: PosixTime,
  fee: Fee,
}

fn check_datum_and_output(
  outputs: List<Output>,
  data: Data,
  validRange: ValidityRange,
) -> Bool {
  expect DatumData { lender, borrower, amount, deadline, .. }: DatumData = data
  // Find UTxO for borrower
  expect Some(output) =
    list.find(
      outputs,
      fn(output) {
        let Address { payment_credential, .. } = output.address
        when payment_credential is {
          VerificationKeyCredential(hash) -> (hash == borrower)?
          _ -> False?
        }
      },
    )
  // Check borrower receive the amount of ADA specified on datum
  let Output { value: val, .. } = output
  lender != borrower && !is_empty(lender) && !is_empty(borrower) && interval.is_entirely_before(
    validRange,
    deadline,
  ) && is_zero(without_lovelace(val)) && lovelace_of(val) == amount
}

validator(params: MintParams) {
  fn borrow(redeemer: RedeemerData, ctx: ScriptContext) -> Bool {
    let MintParams { script, .. } = params
    expect ScriptCredential(script_hash) = script
    let ScriptContext { transaction, purpose } = ctx
    expect tx.Mint(policy_id) = purpose
    let Transaction { outputs, mint, .. } = transaction
    when redeemer is {
      Borrow -> {
        expect [(asset_name, amount)] =
          mint
            |> value.from_minted_value
            |> value.tokens(policy_id)
            |> dict.to_list()
        // Token must go to locking script address
        expect Some(output) =
          list.find(
            outputs,
            fn(output) {
              let Address { payment_credential, .. } = output.address
              when payment_credential is {
                ScriptCredential(hash) -> (hash == script_hash)?
                _ -> False?
              }
            },
          )
        let Output { value: val, datum, .. } = output
        expect [(token_name, token_amount)] =
          val
            |> value.tokens(policy_id)
            |> dict.to_list()
        (asset_name == token_name)? && (amount == token_amount)? && amount == 1 && when
          datum
        is {
          DatumHash(hash) -> {
            expect Some(data) = find_datum([output], dict.new(), hash)
            check_datum_and_output(outputs, data, transaction.validity_range)?
          }
          InlineDatum(data) ->
            check_datum_and_output(outputs, data, transaction.validity_range)?
          _ -> False?
        }
      }
      Pay ->
        mint
          |> value.from_minted_value
          |> value.flatten
          |> list.all(
               fn(asset) {
                 let (p, _, am) = asset
                 p != policy_id || am == -1
               },
             )
    }
  }
}

validator {
  fn pay(datum: DatumData, redeemer: RedeemerData, ctx: ScriptContext) -> Bool {
    when redeemer is {
      Pay -> {
        let DatumData { lender, amount, deadline, fee, .. }: DatumData = datum
        // Calculate lender payment
        let i = rational.from_int(amount)
        expect Some(f) = rational.new(fee.n, fee.d)
        let payment =
          i
            |> rational.add(rational.mul(i, f))
            |> rational.ceil

        let ScriptContext { transaction, purpose } = ctx
        let Transaction { outputs, mint, .. } = transaction

        // Get script’s own input token.
        expect Spend(my_output_reference) = purpose
        expect Some(input) =
          transaction.inputs
            |> find_input(my_output_reference)
        let Output { value: input_value, .. } = input.output
        expect [(policy_id, asset_name, _)] =
          input_value
            |> value.without_lovelace
            |> value.flatten

        // Get mint/burn token
        expect [(p, name, am)] =
          mint
            |> value.from_minted_value
            |> value.flatten

        // Get lender's UTxO
        expect Some(output) =
          list.find(
            outputs,
            fn(output) {
              let Address { payment_credential, .. } = output.address
              when payment_credential is {
                VerificationKeyCredential(hash) -> (hash == lender)?
                _ -> False?
              }
            },
          )
        let Output { value: val, .. } = output

        // Check lender receive the amount of ADA specified on datum
        policy_id == p && asset_name == name && am == -1 && interval.is_entirely_before(
          transaction.validity_range,
          deadline,
        ) && lovelace_of(val) == payment
      }
      _ -> False
    }
  }
}
