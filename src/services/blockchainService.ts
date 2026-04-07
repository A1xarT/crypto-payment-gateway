import axios from 'axios';
import { config } from '../config';
import {
  Block,
  Transaction,
  TransactionReceipt,
  AddressInfo,
  NetworkStats,
} from '../types';

class BlockchainService {
  private rpcUrl: string;
  private requestId: number = 0;

  constructor() {
    this.rpcUrl = config.blockchain.rpcUrl;
  }

  private async rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
    const response = await axios.post(this.rpcUrl, {
      jsonrpc: '2.0',
      method,
      params,
      id: ++this.requestId,
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.result as T;
  }

  private hexToNumber(hex: string): number {
    return parseInt(hex, 16);
  }

  private formatBlock(raw: Record<string, string>): Block {
    return {
      hash: raw.hash,
      number: this.hexToNumber(raw.number),
      parentHash: raw.parentHash,
      timestamp: this.hexToNumber(raw.timestamp),
      miner: raw.miner,
      difficulty: raw.difficulty,
      totalDifficulty: raw.totalDifficulty,
      size: this.hexToNumber(raw.size),
      gasLimit: this.hexToNumber(raw.gasLimit),
      gasUsed: this.hexToNumber(raw.gasUsed),
      transactionCount: Array.isArray(raw.transactions) ? raw.transactions.length : 0,
      transactions: Array.isArray(raw.transactions) ? raw.transactions as unknown as string[] : [],
    };
  }

  private formatTransaction(raw: Record<string, string>): Transaction {
    return {
      hash: raw.hash,
      blockHash: raw.blockHash,
      blockNumber: this.hexToNumber(raw.blockNumber),
      from: raw.from,
      to: raw.to || null,
      value: raw.value,
      gas: this.hexToNumber(raw.gas),
      gasPrice: raw.gasPrice,
      nonce: this.hexToNumber(raw.nonce),
      input: raw.input,
      transactionIndex: this.hexToNumber(raw.transactionIndex),
    };
  }

  async getLatestBlockNumber(): Promise<number> {
    const hex = await this.rpcCall<string>('eth_blockNumber');
    return this.hexToNumber(hex);
  }

  async getBlockByNumber(blockNumber: number | 'latest', includeTransactions = false): Promise<Block> {
    const tag = blockNumber === 'latest' ? 'latest' : `0x${blockNumber.toString(16)}`;
    const raw = await this.rpcCall<Record<string, string>>('eth_getBlockByNumber', [tag, includeTransactions]);
    if (!raw) throw new Error(`Block ${blockNumber} not found`);
    return this.formatBlock(raw);
  }

  async getBlockByHash(hash: string, includeTransactions = false): Promise<Block> {
    const raw = await this.rpcCall<Record<string, string>>('eth_getBlockByHash', [hash, includeTransactions]);
    if (!raw) throw new Error(`Block ${hash} not found`);
    return this.formatBlock(raw);
  }

  async getTransactionByHash(hash: string): Promise<Transaction> {
    const raw = await this.rpcCall<Record<string, string>>('eth_getTransactionByHash', [hash]);
    if (!raw) throw new Error(`Transaction ${hash} not found`);
    return this.formatTransaction(raw);
  }

  async getTransactionReceipt(hash: string): Promise<TransactionReceipt> {
    const raw = await this.rpcCall<Record<string, unknown>>('eth_getTransactionReceipt', [hash]);
    if (!raw) throw new Error(`Receipt for ${hash} not found`);
    return {
      transactionHash: raw.transactionHash as string,
      blockHash: raw.blockHash as string,
      blockNumber: this.hexToNumber(raw.blockNumber as string),
      from: raw.from as string,
      to: (raw.to as string) || null,
      contractAddress: (raw.contractAddress as string) || null,
      status: raw.status === '0x1',
      gasUsed: this.hexToNumber(raw.gasUsed as string),
      cumulativeGasUsed: this.hexToNumber(raw.cumulativeGasUsed as string),
      logs: (raw.logs as Record<string, unknown>[]).map((log) => ({
        address: log.address as string,
        topics: log.topics as string[],
        data: log.data as string,
        blockNumber: this.hexToNumber(log.blockNumber as string),
        transactionHash: log.transactionHash as string,
        logIndex: this.hexToNumber(log.logIndex as string),
      })),
    };
  }

  async getAddressInfo(address: string): Promise<AddressInfo> {
    const [balanceHex, txCountHex, code] = await Promise.all([
      this.rpcCall<string>('eth_getBalance', [address, 'latest']),
      this.rpcCall<string>('eth_getTransactionCount', [address, 'latest']),
      this.rpcCall<string>('eth_getCode', [address, 'latest']),
    ]);

    const isContract = code !== '0x';

    return {
      address,
      balance: balanceHex,
      transactionCount: this.hexToNumber(txCountHex),
      isContract,
      ...(isContract && { code }),
    };
  }

  async getNetworkStats(): Promise<NetworkStats> {
    const [blockNumberHex, networkIdHex, gasPriceHex] = await Promise.all([
      this.rpcCall<string>('eth_blockNumber'),
      this.rpcCall<string>('net_version'),
      this.rpcCall<string>('eth_gasPrice'),
    ]);

    let peerCount = 0;
    try {
      const peerCountHex = await this.rpcCall<string>('net_peerCount');
      peerCount = this.hexToNumber(peerCountHex);
    } catch {
      // some providers don't expose net_peerCount
    }

    return {
      latestBlock: this.hexToNumber(blockNumberHex),
      networkId: networkIdHex,
      gasPrice: gasPriceHex,
      peerCount,
    };
  }
}

export const blockchainService = new BlockchainService();
