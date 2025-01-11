import {
    Action,
    composeContext,
    generateObject,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    Plugin,
    Provider,
    State,
} from "@elizaos/core";
import { fetchAccountTimeline, TimelineEvent } from "./lib/zapper";
import { createSummarizationTemplate, swapTemplate } from "./lib/template";
import { z } from "zod";
import { getSwapQuote } from "./lib/swap";


const zappeProvider: Provider = {
    get: async function (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<TimelineEvent[]> {
        const addresses = ["0x849151d7d0bf1f34b70d5cad5149d28cc2308bf1"];
        try {
            const response = await fetchAccountTimeline({ addresses });
            return response;
        } catch (e) {
            console.error(`Error fetching onchain txs ${e}`);
        }
        return [];
    },
};

const fetchOnchainTimelineAction: Action = {
    name: "ONCHAIN_TIMELINE",
    similes: ["TRANSACTION_HISTORY", "WALLET_TRANSCTION", "ONCHAIN_SUMMARY"],
    description: "Fetches the onchain timeline & transction history for specified wallet addresses.",
    validate: async function (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> {

        
        // Extract Ethereum addresses from the message content
        const messageText = message.content?.text || "";
        const ethereumAddressRegex = /0x[a-fA-F0-9]{40}/g;
        const foundAddresses = messageText.match(ethereumAddressRegex);

        console.log({foundAddresses});
        // Message must contain at least one valid Ethereum address
        if (!foundAddresses || foundAddresses.length === 0) {
            return false;
        }

        return true;

    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        // Extract Ethereum addresses from the message content
        const messageText = message.content?.text || "";
        const ethereumAddressRegex = /0x[a-fA-F0-9]{40}/g;
        const extractedAddresses =
            messageText.match(ethereumAddressRegex) || [];

        // If no addresses found in message, use default address
        if (extractedAddresses.length === 0) {
            // Check if there are already transactions in memory
            const memories = runtime.messageManager.getMemories({
                roomId: message.roomId,
            });

            console.log({ memories });

            callback({ text: "Provide me 0x wallet address to fetch info" });
            return true;
        }
        const addresses = extractedAddresses;

        callback({
            text: "Ok! fetching onchain transactions for ${addresses}",
        });
        try {
            const response = await fetchAccountTimeline({ addresses });

            const jsonResponse = JSON.stringify(response);

            const state = await runtime.composeState(message, {
                transactions: jsonResponse,
            });
            const context = composeContext({
                state,
                template: createSummarizationTemplate,
            });


            const generatedResponse = await generateText({
                runtime,
                context,
                modelClass: ModelClass.MEDIUM,
            });

            const content = {
                text: `Onchain transaction information of wallet address ${extractedAddresses} is ${generatedResponse}`,
            };

            await runtime.messageManager.createMemory({
                roomId: message.roomId,
                agentId: message.agentId,
                userId: message.userId,
                content,
            });
            callback(content);
            return true;
        } catch (e) {
            console.error(`Error fetching onchain txs ${e}`);
        }
        return true;
    },
    examples: [
        [
            {
                user: "user1",
                content: {
                    text: "Show me my recent transactions",
                },
            },
            {
                user: "maxi",
                content: {
                    text: "Here are your recent transactions:\n- Swapped 0.5 ETH for 1000 USDC on Uniswap\n- Deposited 1000 USDC into Aave lending pool\n- Received 0.1 ETH from 0x123...abc",
                },
            },
        ],
    ],
};

// Base resource schema
export const SwapSchema = z.object({
    inputTokenSymbol: z.string().optional(),
    outputTokenSymbol: z.string().optional(),
    inputTokenCA: z.string().optional(),
    outputTokenCA: z.string().optional(),
    amount: z.string().or(z.number()).optional()
});
/**
 *
 *
 {
    "inputTokenSymbol": string | null,
    "outputTokenSymbol": string | null,
    "inputTokenCA": string | null,
    "outputTokenCA": string | null,
    "amount": number | string | null
}
 */


const checkIfFieldExits = (data: string) => {
    return data && data.length >0;
}

const swapTokenAction: Action = {
    name: "SWAP_TOKEN",
    similes: ["BUY_TOKEN", "PURCHASE_TOKEN"],
    description: "Swap one token for another token",
    validate: async function (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> {
            return true;

    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        try {
            // composeState
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const swapContext = composeContext({
                state,
                template: swapTemplate,
            });

            const response = await generateText({
                runtime,
                context: swapContext,
                modelClass: ModelClass.MEDIUM,
            });

            const jsonResponse = JSON.parse(response)

            const inputTokenSymbol = jsonResponse.inputTokenSymbol;
            const outputTokenSymbol = jsonResponse.outputTokenSymbol;
             const inputTokenAdress = jsonResponse.inputTokenCA;
             const outputTokenAddress = jsonResponse.outputTokenCA;
             const amount = jsonResponse.amount;

             const parseAmount = amount && typeof amount === 'string' ? parseFloat(amount) : typeof amount === 'number' ? amount : undefined;


             if (checkIfFieldExits(inputTokenAdress) && checkIfFieldExits(outputTokenAddress) && parseAmount) {

                const taker = ''
                const txData = await getSwapQuote({
                    buyToken: outputTokenAddress,
                    sellToken: inputTokenAdress,
                    sellAmount: amount,
                    chainId: 8453,
                    taker,
                })


             } else {
                const content = {
                    text: `Sorry, I couldn't identify the inputs for buying tokens. inputTokenAddress: ${inputTokenAdress} outputTokenAddress: ${outputTokenAddress} amount: ${parseAmount}`,
                };

                callback?.(content);
             }


            return true;
        } catch (error) {
            console.error("Error in swap token handler:", error);
            const errorContent = {
                text: "Sorry, there was an error processing your swap request.",
            };
            callback?.(errorContent);
            return false;
        }
    },
    examples: [
        [
            {
                user: "user1",
                content: {
                    text: "swap 0.5 ETH for USDC",
                },
            },
            {
                user: "maxi",
                content: {
                    text: "Swapeed 0.5 ETH for 100 USDC.  Here is the transaction hash for 0xb93a69aec29ec4a01f56edecb52522437287096b737b08ebfc772dd487597820.",
                },
            },
        ],
        [
            {
                user: "user1",
                content: {
                    text: "Buy VIRTUALS worth 0.5 ETH ",
                },
            },
            {
                user: "maxi",
                content: {
                    text: "Swapeed 0.5 ETH for 100 VIRTUALS.  Here is the transaction hash for 0xb93a69aec29ec4a01f56edecb52522437287096b737b08ebfc772dd487597820.",
                },
            },
        ],
    ],
};

export const maxiPlugin: Plugin = {
    description: "Plugin for Moxie Maxi",
    name: "Maxi",
    actions: [swapTokenAction, fetchOnchainTimelineAction,],
    evaluators: [],
    providers: [],
};
