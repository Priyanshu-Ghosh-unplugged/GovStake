# OmniProof: Verifiable Data Oracle for Agents

## Inspiration
*   **The Problem:** In an agent-to-agent economy, agents need web data (prices, facts, external API responses) to make decisions (e.g., assessing sellers, authorizing transactions). However, there is zero guarantee that the data provider isn't hallucinating, hallucinating evidence, or intentionally lying.
*   **Current Flaws:** Traditional agents blindly trust the text responses from other agents or web-scraping utilities.
*   **Our Solution:** OmniProof is a Verifiable Data Oracle. It doesn't just fetch data; it attaches a cryptographic "Proof of Source" receipt to every single request, eliminating trust from the equation.

## What it does
*   **Verifiable Web Fetching:** When an agent requests data (e.g., "What is the price of ETH?"), OmniProof fetches it and returns the data wrapped in a cryptographic signature proving the exact source and timestamp.
*   **Strict Role Design:** We enforce hard role separation between Data Consumers (buyer agents), the Data Broker (OmniProof), and Verifiers (the cryptographic protocol).
*   **Recipient-Specific Authorization:** Agents access the Oracle via scoped API keys. OmniProof enforces hard-coded call limits and maintains persistent usage records to prevent abuse.
*   **Practical Collaboration:** OmniProof serves as a foundational utility. Other agents use our verifiable data to assess sellers, evaluate delivery, and authorize calls securely.
*   **Live Intelligence Hub:** A stunning Next.js dashboard that visualizes the real-time stream of verifiable data requests, cryptographic receipts, and agent API usage.

## How we built it
*   **Architecture:** A scalable monorepo using TypeScript and Next.js.
*   **Oracle Engine:** An Express backend that handles API requests, fetches external data, and generates unforgeable source receipts.
*   **Next.js Hub:** A React and Tailwind CSS frontend featuring glassmorphism, dynamic data streams, and a beautiful UI for monitoring agent authorization and call limits.

## How it aligns with the Judging Criteria
*   **Evidence that could be checked:** Every piece of data comes with a cryptographic receipt and source verification. We don't just claim to have fetched data; we prove it.
*   **Practical collaboration between agents:** Our service is built specifically to be consumed by other agents in their workflows (discovery, assessment, evaluation).
*   **Role design & Limits:** We implement strict recipient-specific authorization, explicit call limits, and persistent usage records—features specifically praised by the judges in Arena 1.

## Accomplishments that we're proud of
*   **Zero-Trust Data:** Creating a protocol where agents no longer have to blindly trust the data they receive.
*   **The Intelligence Hub:** Building a beautiful, real-time dashboard that makes cryptographic verification visually intuitive.
*   **Market Viability:** Designing a highly practical SaaS monetization model (Pay-Per-Verified-Fetch) for agent developers.

## What's next for OmniProof
*   **Multi-Source Consensus:** Fetching data from multiple independent sources and cryptographically proving consensus before returning the result to the agent.
*   **Zero-Knowledge Proofs:** Allowing agents to prove they have certain data (e.g., proof of reserves) without revealing the actual data to the network.
