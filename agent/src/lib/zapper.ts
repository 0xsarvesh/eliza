import { gql } from "graphql-tag";
import { print } from 'graphql';

const END_POINT = 'https://public.zapper.xyz/graphql'
const API_KEY = process.env.ZAPPER_API_KEY;
const encodedKey = btoa(API_KEY);

// TypeScript interfaces for the response
interface DisplayName {
  value: string;
}

interface User {
  address: string;
  displayName?: DisplayName;
}

interface App {
  name: string;
  imgUrl: string;
}

interface AccountDelta {
  address: string;
  amount: string;
  token: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface Transaction {
  fromUser: User;
  toUser?: User;
  hash: string;
  blockNumber: number;
  timestamp: number;
}

interface TimelineEvent {
  key: string;
  network: string;
  interpretation: {
    processedDescription: string;
  };
  transaction: Transaction;
  app?: App;
  accountDeltasV2?: {
    edges: Array<{
      node: AccountDelta;
    }>;
  };
  timestamp: number;
}

interface TimelineResponse {
    data?: {
      accountsTimeline?: {
        edges: Array<{
          node: TimelineEvent;
        }>;
      };
    };
    errors?: Array<{
      message: string;
      locations?: Array<{
        line: number;
        column: number;
      }>;
    }>;
  }

// GraphQL query
const TIMELINE_QUERY = gql`
  query TimelineQuery(
  $addresses: [Address!]!
  $after: String
  $first: Int
  $network: Network
  $inboundFirst: Int
  $outboundFirst: Int
  $tokenAddresses: [Address!]
  $isSigner: Boolean
  $realtimeInterpretation: Boolean
) {
  accountsTimeline(
    addresses: $addresses
    first: $first
    after: $after
    network: $network
    tokenAddresses: $tokenAddresses
    isSigner: $isSigner
    realtimeInterpretation: $realtimeInterpretation
  ) {
    edges {
      node {
        key
        network
        isEditable
        timestamp
        sigHash
        app {
          name
          slug
          imgUrl
          app {
            displayName
          }
        }
        transaction {
          hash
          to
          link
          fromUser {
            address
            displayName {
              value
              source
            }
            avatar {
              source
              value {
                ... on AvatarUrl {
                  url
                }
                ... on NftAvatar {
                  isCurrentlyHeld
                  nft {
                    tokenId
                    collection {
                      network
                      address
                    }
                  }
                }
              }
            }
          }
          toUser {
            address
            displayName {
              value
              source
            }
            contract {
              address
              network
            }
          }
        }
        interpretation {
          description
          descriptionDisplayItems {
            __typename
            ... on TokenDisplayItem {
              amountRaw
              network
              tokenAddress
              tokenV2 {
                symbol
                decimals
                imageUrl
              }
            }
            ... on NFTDisplayItem {
              network
              collectionAddress
              tokenId
              quantity
              isMint
              isBurn
              nftToken {
                name
              }
            }
          }
          inboundAttachmentsConnection(first: $inboundFirst) {
            edges {
              node {
                __typename
                ... on StringDisplayItem {
                  stringValue
                }
                ... on ImageDisplayItem {
                  url
                }
              }
            }
            totalCount
            nftCount
            pageInfo {
              startCursor
              endCursor
              hasNextPage
            }
          }
          outboundAttachmentsConnection(first: $outboundFirst) {
            edges {
              node {
                __typename
                ... on StringDisplayItem {
                  stringValue
                }
                ... on ImageDisplayItem {
                  url
                }
              }
            }
            totalCount
            nftCount
            pageInfo {
              startCursor
              endCursor
              hasNextPage
            }
          }
        }
        perspectiveDelta {
          account {
            address
            isContract
          }
          nftDeltasCount
          tokenDeltasV2(first: 6) {
            edges {
              node {
                amount
                token {
                  address
                  symbol
                  network
                  onchainMarketData {
                    price
                  }
                }

              }
            }
          }
          nftDeltasV2(first: 12) {
            edges {
              node {
                collectionAddress
                tokenId
                amount
                nft {
                  name
                  tokenId
                  collection {
                    address
                    network
                    name
                  }
                }
              }
            }
          }
        }
        accountDeltasV2 {
          edges {
            node {
              tokenDeltasV2 {
                edges {
                  node {
                    token {
                      address
                      name
                      onchainMarketData {
                        priceChange24h
                        priceChange1h
                        price
                        marketCap
                      }
                    }
                    amount
                  }
                }
              }
              nftDeltasV2 {
                edges {
                  node {
                    nft {
                      name
                      tokenId
                      estimatedValue {
                        valueUsd
                      }
                    }
                    amount
                  }
                }
              }
            }
          }
        }
      }
      cursor
    }
    pageInfo {
      startCursor
      endCursor
      hasNextPage
      hasPreviousPage
    }
  }
}
`;

interface FetchTimelineOptions {
  addresses: string[];
  realtimeInterpretation?: boolean;
  isSigner?: boolean;
}

async function fetchAccountTimeline({
  addresses,
  realtimeInterpretation = true,
  isSigner = true
}: FetchTimelineOptions): Promise<TimelineEvent[]> {
  try {
    const response = await fetch(END_POINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedKey}`,
      },
      body: JSON.stringify({
        query: print(TIMELINE_QUERY), // Convert the AST to a string
        variables: {
          addresses,
          realtimeInterpretation,
          isSigner,
          first: 100
        }
      })
    });

    const responseData: TimelineResponse = await response.json();


    // Log full response for debugging
    console.log('Full response:', JSON.stringify(responseData, null, 2));

    // Check for GraphQL errors
    if (responseData.errors) {
      const errorMessages = responseData.errors.map(error => error.message).join(', ');
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }

    // Validate response structure
    if (!responseData.data?.accountsTimeline?.edges) {
      throw new Error('Invalid response structure: missing accountsTimeline.edges');
    }

    // Extract and return the timeline events
    return responseData.data.accountsTimeline.edges.map(edge => edge.node);
  } catch (error) {
    console.error('Error fetching account timeline:', error);
    throw error;
  }
}

export type {
  TimelineEvent,
  AccountDelta,
  User,
  App,
  Transaction,
  FetchTimelineOptions
};

export { fetchAccountTimeline };

