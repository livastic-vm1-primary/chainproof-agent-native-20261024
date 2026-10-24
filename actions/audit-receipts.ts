import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { auditReceipts } from "../lib/receipt-audit";

const recordSchema = z.object({
  label: z.string().max(90).describe("Human-friendly evidence label"),
  chainId: z.number().int().describe("EVM chain ID, such as Base mainnet 8453"),
  tokenContract: z.string().describe("Full ERC-20 token contract address"),
  txHash: z.string().describe("Transaction hash 0x followed by 64 hex digits"),
  logIndex: z.number().int().describe("ERC-20 event log index within transaction"),
  from: z.string().describe("Transfer sender address 0x plus 40 hex digits"),
  to: z.string().describe("Transfer recipient address 0x plus 40 hex digits"),
  amountAtomic: z.string().describe("USDC value in atomic units, 6 decimals; positive integer string"),
  source: z.enum(["customer", "marketplace_operator", "bounty", "self_test"])
    .describe("Source category, self_test is not revenue"),
  finalityAttested: z.boolean().describe("Source asserts chain finality, but assertion is NOT independent proof"),
  erc20TransferAttested: z.boolean().describe("Source asserts ERC20 Transfer log, but assertion is NOT independent proof"),
});
export default defineAction({
  description: "Audit up to 100 user-supplied Base USDC ERC-20 transfer records for wrong chains/tokens, self payments, duplicate event ids, missing proof, and nominal candidate gross. NEVER independently marks income paid.",
  mcpTool: true,
  readOnly: true,
  schema: z.object({
    expectedPayee: z.string().describe("Expected Base payee 0x address with 40 hex digits"),
    records: z.array(recordSchema).max(100).describe("Local receipt records to screen without blockchain RPC"),
  }),
  run: async ({ expectedPayee, records }) => {
    return auditReceipts(expectedPayee, records);
  },
});
