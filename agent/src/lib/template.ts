export const createSummarizationTemplate = `
Analyze these blockchain transactions and create a summary with the following:

1. Sort transactions by USD value (highest to lowest), calculated by multiplying token amount by current price
2. For each significant transaction include:
   - Transaction hash and explorer link
   - Date and time
   - Token amounts involved
   - Token address & symbol
   - USD value of transaction
   - Current token prices
   - 24h price changes
   - Market capitalization
3. Group related transactions together
4. Exclude basic approvals and low-value transactions
5. Add any relevant context about protocols or tokens involved
6. Format dollar values consistently with appropriate rounding

Please present the information in descending order by transaction value, with a clear hierarchy of importance. Also strictly generate this response in short words as I will use this for followup prompts.
{{transactions}}
`;


export const swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:

{
    "inputTokenSymbol": "ETH",
    "outputTokenSymbol": "USDC",
    "inputTokenCA": "So11111111111111111111111111111111111111112",
    "outputTokenCA": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": 1.5
}


{{recentMessages}}

Given the recent messages and wallet information below:

{{walletInfo}}

Extract the following information about the requested token swap:
- Input token symbol (the token being sold)
- Output token symbol (the token being bought)
- Input token contract address if provided
- Output token contract address if provided
- Amount to swap

Return only a valid JSON object with no markdown formatting or code blocks. Use null for any values that cannot be determined. The result should be a valid JSON object with the following schema:

{
    "inputTokenSymbol": string | null,
    "outputTokenSymbol": string | null,
    "inputTokenCA": string | null,
    "outputTokenCA": string | null,
    "amount": number | string | null
}
`;

