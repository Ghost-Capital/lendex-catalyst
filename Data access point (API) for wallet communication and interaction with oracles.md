# API Markdown documentation

---

# User Journey:

### 1. The ETH NFT Lender starts the journey:

- Ethereum user wants 10,000 ADA for their ETH NFT.
- Adds ETH NFT as collateral for the desired 10,000ADA.
- ETH user sets their timeframe of repayment and APY based on duration.

### 2. ADA Liquidity User Accepts & Provides Liquidity:

- ADA user finds the opportunity of an ETH NFT for 10,000 ADA and is happy with the opportunity. They perceive the collateral value as higher than the 10,000 ADA requested by the ETH user.
- They provide the 10,000 ADA.

***Now the ETH NFT is locked in the contract as collateral incase of default and the ADA is made available for the ETH user.***

### 3 Final Outcomes:

### 3.1 Default on Loan:

- ADA user, the creditor keeps the collateral of the ETH NFT.
- ETH user, the debtor keeps the ADA and nothing is required to repay.
- Contract is closed.

### 3.2 Repayment on Loan:

- ADA user, the creditor receives their initial 10,000ADA back + agreed upon interest based on time of repayment and APY. The terms of the contract should be stored and highlighted here at closure again.
- ETH user, the debtor receives their ETH NFT back from the contract. The collateral is removed.
- Contract is closed.

---

# Interaction with Oracles & Wallets in this Journey:

1. **Initial Collateral Assessment**: When the ETH NFT Lender adds their ETH NFT as collateral for the desired ADA, an oracle may be needed to assess the current value of the ETH NFT in terms of ADA. This would ensure that the collateral value meets the required threshold for the loan.
2. **Collateral Locking**: When the ADA Liquidity User accepts the offer and provides liquidity in ADA, the ETH NFT would need to be locked in the contract as collateral. This locking process may involve interactions with the connected wallet to sign and execute the transaction on the blockchain.
3. **Default or Repayment Outcome**: At the final outcomes stage, when either default or repayment occurs, interactions with the connected wallet may be needed to execute the transfer of assets according to the terms of the contract. For example:
    - If there's a default, the ADA user (creditor) will need to interact with their wallet to claim the collateral (ETH NFT).
    - If the loan is repaid, both parties may need to interact with their wallets with the dapp to have their respective assets returned (ADA or ETH NFT) as per the contract terms.
4. **Storing Contract Terms**: Throughout the process, it's important to store and retrieve the terms of the contract. This could involve interacting with an oracle to fetch and display contract details or storing contract terms on-chain for reference during closure. Storing the contract on-chain guarantees immutable terms.

---

# API Specification:

### Base URL:

```
https://api.lendex.app
```

### Authentication:

- Authentication may be required for some endpoints. This can be achieved using wallet authentication. Ensuring only authorized users to perform actions on their relevant Lendex contracts.

### ETH NFT Lender Journey: *Debtor*

1. **Request Loan:**
    
    ```
    POST /loans/request
    ```
    
    - Request Body:
        
        ```json
        {
          "eth_address": "0x...",
          "nft_id": "nft_id_here",
          "amount_ada": 10000,
          "repayment_timeframe_days": 30,
          "apy": 10
        }
        
        ```
        
    - Description: Initiates a loan request for the specified Ethereum NFT.
    
2. **View Loan Status:**
    
    ```
    GET /loans/:loan_id/status
    
    ```
    
    - Description: Retrieves the current status and details of the loan identified by `loan_id`.

### ADA Liquidity Provider Journey: *Creditor*

1. **Provide ADA Liquidity:**
    
    ```
    POST /liquidity/provide
    
    ```
    
    - Request Body:
        
        ```json
        {
          "ada_address": "ADA_address_here",
          "loan_id": "loan_id_here",
          "amount_ada": 10000
        }
        
        ```
        
    - Description: Provides ADA liquidity for the specified loan.
2. **View Collateral Details:**
    
    ```
    GET /collateral/:loan_id/details
    
    ```
    
    - Description: Retrieves details about the collateral held for the loan identified by `loan_id`.

### Final Outcomes:

1. **Handle Default on Loan:**
    1. Users keep their assets and contract closes. Nothing to do or exchange.
2. **Handle Repayment of Loan:**
    1. ETH NFT Lender repays the loan amount in ADA with agreed interest included.
    2. Payment through our interface allows us track the transaction and then release the collateral upon it’s confirmation. If a user mistakenly repays out of interface, they can paste the transaction and we can do a check on the timestamp, wallets etc. This is more risky however as Lendex has less control over tagging the transaction.
    3. Close the contract once both are repaid and return collateral to ETH NFT user.

### Response Formats:

- All responses are returned in JSON format.
- Standard HTTP status codes are used to indicate the success or failure of requests.

### Error Handling:

- Detailed error messages are provided in case of failures, indicating the cause of the error or missing data.

---

# Reservoir API Integration

1. **Verify NFT Ownership:**
    
    ```
    GET /nft/:nft_id/ownership
    
    ```
    
    - Description: Verifies if the user owns the NFT identified by `nft_id`.
    - Parameters:
        - `nft_id`: The ID of the NFT to be verified.
    - Response:
        - `owned`: Boolean indicating whether the user owns the NFT.

1. **Fetch NFT Token Data:**
    
    ```
    GET /nft/:nft_id/data
    
    ```
    
    - Description: Retrieves metadata, market, and order data for the NFT identified by `nft_id`.
    - Parameters:
        - `nft_id`: The ID of the NFT to fetch data for.
    - Response:
        - Detailed metadata, market, and order data for the NFT.

1. **Fetch NFT Activity Data:**
    
    ```
    GET /nft/:nft_id/activity
    
    ```
    
    - Description: Retrieves recent and historical activity data for the NFT identified by `nft_id`.
    - Parameters:
        - `nft_id`: The ID of the NFT to fetch activity data for.
    - Response:
        - Recent and historical activity data for the NFT.

1. **Fetch NFT Floor Price:**
    
    ```
    GET /nft/:nft_id/floor
    
    ```
    
    - Description: Retrieves the floor price for the NFT identified by `nft_id`.
    - Parameters:
        - `nft_id`: The ID of the NFT to fetch the floor price for.
    - Response:
        - Floor price information for the NFT.

1. **Verify NFT Collection & Policy ID:**
    
    ```
    GET /nft/:nft_id/verify
    
    ```
    
    - Description: Verifies the collection and policy ID associated with the NFT identified by `nft_id`.
    - Parameters:
        - `nft_id`: The ID of the NFT to verify.
    - Response:
        - `collection`: Name of the collection associated with the NFT.
        - `policy_id`: Policy ID associated with the NFT.

### Response Formats:

- All responses are returned in JSON format.
- Standard HTTP status codes are used to indicate the success or failure of requests.

### Error Handling:

- Detailed error messages are provided in case of failures, ensuring transparency and aiding in troubleshooting.

By incorporating these endpoints with wallet authentication, Lendex can ensure secure access to NFT data and provide users with valuable insights for making informed lending decisions.