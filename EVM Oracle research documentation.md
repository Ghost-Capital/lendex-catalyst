# Oracle research documentation

# DON Overview (Decentralized Oracle Network)

### Links to relevant Oracle sites

[https://chain.link/](https://chain.link/)

[https://www.bandprotocol.com/](https://www.bandprotocol.com/)

[https://pyth.network/](https://pyth.network/)

[https://uma.xyz/](https://uma.xyz/)

[https://www.diadata.org/](https://www.diadata.org/)

[https://www.seda.xyz/](https://www.seda.xyz/)

[https://supra.com/](https://supra.com/)

[https://relicprotocol.com/](https://relicprotocol.com/)

[https://uma.xyz/osnap](https://uma.xyz/osnap)

[https://acurast.com/](https://acurast.com/)

## Chainlink

### Supports

- Ethereum
- Polygon
- Avalanche
- BNB
- Arbitrum
- Optimism

### Pros

- Widely used and battle-tested
- Supports various data sources and blockchains (EVM included)
- Offers multiple oracle products.
- Currently the most used EVM oracle provider.

### Cons

- Can be complex to set up.
- Cost can tend to be slightly higher.

---

## Band Protocol

### Supports

- Ethereum
- BNB

### Pros

- Easy to use (allows custom oracles with WebAssembly)
- Supports multiple blockchains (EVM included)
- Offers real-time data.

### Cons

- Less mature solution compared to other options.

---

## Pyth Network

### Supports

- Ethereum
- Polygon
- Solana
- Avalanche
- BNB

### Pros

- Known for reliable financial data

### Cons

- Needs cons

---

## UMA

### Supports

- Ethereum
- Polygon

### Pros

- UMA (Optimistic Oracle) offers a unique dispute resolution mechanism for data accuracy.

### Cons

- Might not be the most suitable solution for general purpose data feeds on EVM
- UMA (Optimistic Node Aggregation Protocol) oSnap is a governance tool built on UMA, not a general purpose oracle.

---

## DIA

### Supports

- Ethereum
- Polygon
- Solana
- Arbitrum
- Avalanche
- BNB
- Optimism

### Pros

- Secure and transparent oracles with real-time data feeds, supports multiple blockchains (EVM included), allows building custom oracles.

### Cons

- Less feature-rich than other options.

---

## SEDA

### Supports

- Ethereum
- Polygon
- Arbitrum
- BNB

### Pros

- Permissionless and modular data layer for custom data feeds on any blockchain.

### Cons

- Seems to be a new data layer standard, might have less adoption compared to other options.

---

## SupraOracles

### Supports

- Ethereum
- Polygon
- Aptos
- Sui
- Optimism
- Arbitrum
- Avalanche
- BNB
- Fantom
- Astar
- Celo
- Cronos
- EVM
- Gnosis
- Klaytn
- Mantle
- Multichain
- Moonbeam

### Pros

- Faster data feeds, secure, connects to multiple networks (EVM included).

### Cons

- Smaller developer community
- Less mature option

---

## Relic Protocol

### Supports

- Ethereum

### Pros

- Focuses on secure access to Ethereum's historical data, minimal gas costs.

### Cons

- Not suitable for general purpose data feeds on EVM.

---

## Acurast

### Supports

- Ethereum
- Base
- Polygon
- Polkadot
- Optimism
- BNB
- Arbitrum
- Astar
- Moonbeam
- EVM
- Tezos

### Pros

- Offers various services including compute power, data scraping, and data feeds.

### Cons

- Less core focus on being an Oracle provider.

---

## Selection criteria for our DON

**Reliability**

- **Proven Track Record:** Look for a well-established network with a history of secure operation and reliable data delivery.
- **Decentralization:** A network with multiple data providers ensures data accuracy and avoids single points of failure.
- **Dispute Resolution:** Consider how disagreements about data validity are handled. Transparent mechanisms are crucial for maintaining trust.

**Open-Source Friendly**

- **Clear Documentation:** Comprehensive documentation is essential for easy integration into your open-source project.
- **Active Development:** Ongoing updates and improvements ensure the oracle stays relevant and secure.
- **Open-Source Community:** A community that embraces open-source development provides valuable support and collaboration opportunities.

**Additional Considerations**

- **Blockchain Compatibility:** Ensure the DON seamlessly integrates with your project's chosen blockchain, in our case it would currently be EVM.
- **Data Feed Options:** Choose a DON that offers the specific data feeds your project requires.
- **Ease of Use:** Consider the complexity of setup and developer resources needed for integration.

---

## Selecting our DON

Given the selection criteria, we narrowed it down to two possible options. Chainlink and Band Protocol.

**Initial Screening**

We started by examining all the potential DON partners. While some, like Pyth Network and Supra Oracles, showcased interesting features, limited information regarding their proven track record, community size, or focus on open-source development raised concerns. Others, such as Relic Protocol and UMA, seemed better suited for specialized data needs rather than general-purpose data feeds in the EVM environment.

**Focusing on Strong Contenders**

This initial screening left us with several strong contenders: Chainlink, Band Protocol, UMA, DIA, and SEDA.

- **UMA:** While offering a unique dispute resolution mechanism, it might not be the most appropriate choice for our project's general-purpose data feed requirements on EVM.
- **SEDA:** This new data layer standard seems promising, but its limited adoption compared to established players created some uncertainty.
- **DIA:** Although secure and offering real-time data with EVM compatibility, DIA might have a slightly smaller feature set compared to Chainlink and Band Protocol.

**Chainlink vs. Band Protocol**

After this first round of evaluation, Chainlink and Band Protocol emerged as the frontrunners. Both offered:

- Established track record and focus on reliability.
- Decentralized architecture for data accuracy and security.
- Transparent dispute resolution mechanisms.
- EVM compatibility for seamless integration with Lendex.
- Comprehensive documentation and active development teams.

However, key differentiators helped us choose Chainlink:

- **Proven Track Record and Larger Community:** Chainlink's more established reputation and significantly larger developer community provided a strong sense of trust and potential for collaboration within the open-source world. Lendex is an open source project, so this was a big focus in our selection process.

**Conclusion: Chainlink**

After this thorough analysis, Chainlink stood out as the most suitable option for our open-source project. Its established reputation, proven track record, and robust developer community provide a strong foundation for reliability and security. While Band Protocol offers a compelling alternative with its ease of use, Chainlink's larger open-source ecosystem and extensive resources ultimately make it the more dependable choice for a complex open-source project like Lendex.

Please note: This analysis was performed In March of 2024 and has been based on the information available at the time. It's always recommended to conduct your own research and stay updated on the ever-evolving landscape of Decentralized Oracle Networks if you intend to use the open-source work from the Lendex project.

---