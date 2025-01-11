

interface SwapQuoteParams {
    chainId: number;
    buyToken: string;
    sellToken: string;
    sellAmount: string;
    taker: string;
    txOrigin?: string;
    swapFeeRecipient?: string;
    swapFeeBps?: number;
    swapFeeToken?: string;
    tradeSurplusRecipient?: string;
    gasPrice?: string;
    slippageBps?: number;
    excludedSources?: string;
    sellEntireBalance?: boolean;
    forceEncodeSlippage?: boolean;
  }

  interface SwapQuoteResponse {
    buyAmount: string;
    transaction: {
      to: string;
      data: string;
      gas: string;
      gasPrice: string;
      value: string;
    };
    // Other fields are available but we're focusing on transaction data
  }

  export async function getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteResponse> {
    const baseUrl = 'https://api.0x.org';
    const endpoint = '/swap/v1/quote';

    // Convert params to URLSearchParams
    const queryParams = new URLSearchParams({
      chainId: params.chainId.toString(),
      buyToken: params.buyToken,
      sellToken: params.sellToken,
      sellAmount: params.sellAmount,
      taker: params.taker,
      ...(params.txOrigin && { txOrigin: params.txOrigin }),
      ...(params.swapFeeRecipient && { swapFeeRecipient: params.swapFeeRecipient }),
      ...(params.swapFeeBps && { swapFeeBps: params.swapFeeBps.toString() }),
      ...(params.swapFeeToken && { swapFeeToken: params.swapFeeToken }),
      ...(params.tradeSurplusRecipient && { tradeSurplusRecipient: params.tradeSurplusRecipient }),
      ...(params.gasPrice && { gasPrice: params.gasPrice }),
      ...(params.slippageBps && { slippageBps: params.slippageBps.toString() }),
      ...(params.excludedSources && { excludedSources: params.excludedSources }),
      ...(params.sellEntireBalance && { sellEntireBalance: params.sellEntireBalance.toString() }),
      ...(params.forceEncodeSlippage && { forceEncodeSlippage: params.forceEncodeSlippage.toString() })
    });

    try {
      const response = await fetch(`${baseUrl}${endpoint}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          '0x-api-key': '16fa1e69-d64d-4f50-b6c0-8b259236bb3d',
          '0x-version': 'v2',
          'Accept': 'application/json'
        }
      });
      const { transaction } = await response.json();

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get swap quote: ${JSON.stringify(errorData)}`);
      }

      const data: SwapQuoteResponse = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Error fetching swap quote: ${error.message}`);
    }
  }