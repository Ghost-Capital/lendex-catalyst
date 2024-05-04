# Cardano oracle feasibility document

## Cardano Oracles (DONs)

This document outlines the considerations for implementing the Cardano side of Lendex, which allows users to lock EVM NFTs as collateral for ADA loans. We'll explore two approaches:

**Possible Cardano options**

1. **Cardano Native Implementation (Centralized):** This involves building all logic using Cardano infrastucture such as webhooks (blockfrost), with a centrally hosted server acting as the intermediary for interacting with the EVM chain.
2. **Oracle-based Implementation (Decentralized):** This leverages oracles to fetch data from the EVM chain about NFT details, loan status, and price feeds.

**Clarifying Questions and Considerations:**

- **EVM Chain Support:** Currently, Ethereum is the target chain, with potential future expansion to other EVM chains.
- **Loan Terms:** Loan terms (duration, interest rates) are negotiated between borrower and lender.
- **Collateralization Ratio:** The percentage of borrowed ADA value secured by the NFT is yet to be determined, this is proposed by borrower.
- **EVM NFT Management:** NFTs remain on the EVM chain during the loan period. User A retains custody but provides proof of ownership to the Cardano smart contract.
- **Default Handling and Oracles:** Oracles are used to:
    - Verify User B's ADA payment confirmation on the EVM chain, triggering NFT unlock upon successful repayment.
    - Potentially fetch price feed data for the collateralized NFT (future feature). A price feed would allow us to help educate borrowers/lenders about NFT value in retrospect to an ADA amount.
- **Decentralization Preference:** Decentralization is preferred, but a centrally hosted server can be a temporary solution for efficiency and cost-effectiveness during the initial development phase. We will decide the best way forward while we continue to develop Lendex’s open-source solution.

## Decentralized vs Centralized

Considering the open-source nature of Lendex, and preference for decentralization, an **Oracle-based Implementation** is the ideal long-term solution. Here's a breakdown of both approaches:

**1. Cardano Native Implementation (Centralized):**

**Pros:**

- Potentially faster transaction processing and lower fees compared to oracles.
- More control over the system's functionality.
- Faster iterations while in our development phase.

**Cons:**

- Introduces a central point of failure, reducing trust in a decentralized lending application.
- Requires additional development and maintenance for the centralized server.
- Limited scalability as the user base grows.
- Reliant on Third party providers such as Blockfrost.

**2. Oracle-based Implementation (Decentralized):**

**Pros:**

- Maintains decentralization, fostering trust in the lending application.
- More scalable solution for future growth.
- Leverages existing oracle infrastructure for interacting with the EVM chain.

**Cons:**

- Transaction processing might be slower and potentially more expensive due to oracle fees.
- Dependence on the chosen oracle provider and their service reliability.

## Decentralized Oracle Options

For a decentralized implementation, two Cardano-native oracle providers can be considered:

- **Charli3:** Provides oracles for external data feeds and interoperable smart contracts between Cardano and EVM chains. It's a relatively new solution, so further research into its track record, security audits, and community support is recommended.
- **Orcfax:** Offers decentralized oracle services for bringing off-chain data onto Cardano using inter-node vetoing for data accuracy. Similar to Charli3, it's a new player in the Cardano oracle landscape. Research its track record, audits, and community support to ensure it aligns with your project's needs.

## Centralized Options for development

For a centralized implementation, we can use a mixture of Cardano and EVM webhooks (blockfrost, ogmios, db chain-indexer) to get the latest filtered on-chain information. There are a few points to consider:

- Central point of failure
- Server processing incoming data must be hosted to receive webhooks
- Will allow us to develop our open-source solution faster
- More cost effective for an open-source solution until a viable decentralized Cardano oracle solution is provided

## Conclusion

We are preparing to implement a centralised solution initially to build the product and provide an open-source solution quickly and affordably.

For the initial development phase, a **Cardano Native Implementation** with a central server might be a pragmatic choice due to efficiency and cost considerations. However, to ensure long-term scalability, trust, and alignment with the open-source project's philosophy, transitioning to an **Oracle-based Implementation** is highly recommended. We shall update this document with specific details once the collateralization ratio and oracle provider have potentially been chosen.