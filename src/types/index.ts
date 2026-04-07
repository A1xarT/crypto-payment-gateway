export interface Block {
  hash: string;
  number: number;
  parentHash: string;
  timestamp: number;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  size: number;
  gasLimit: number;
  gasUsed: number;
  transactionCount: number;
  transactions: string[];
}

export interface Transaction {
  hash: string;
  blockHash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  value: string;
  gas: number;
  gasPrice: string;
  nonce: number;
  input: string;
  transactionIndex: number;
  timestamp?: number;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockHash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  contractAddress: string | null;
  status: boolean;
  gasUsed: number;
  cumulativeGasUsed: number;
  logs: Log[];
}

export interface Log {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

export interface AddressInfo {
  address: string;
  balance: string;
  transactionCount: number;
  isContract: boolean;
  code?: string;
}

export interface NetworkStats {
  latestBlock: number;
  networkId: string;
  gasPrice: string;
  peerCount: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  /** Machine-readable error code — present only when success is false */
  code?: string;
  pagination?: {
    page: number;
    limit: number;
    total?: number;
  };
}
