import type { ReceiptInput } from "./receipt-audit";
import { BASE_CIRCLE_USDC } from "./receipt-audit";

export const DEMO_PAYEE = "0x1111111111111111111111111111111111111111";
const SENDER = "0x2222222222222222222222222222222222222222";
const base: ReceiptInput = {
  label: "Illustrative customer 0.01 USDC",
  chainId: 8453,
  tokenContract: BASE_CIRCLE_USDC,
  txHash: "0x" + "a".repeat(64),
  logIndex: 7,
  from: SENDER,
  to: DEMO_PAYEE,
  amountAtomic: "10000",
  source: "customer",
  finalityAttested: true,
  erc20TransferAttested: true,
};

export const DEMO_RECORDS: ReceiptInput[] = [
  base,
  { ...base, label: "Reimported same event (duplicate)" },
  { ...base, label: "Wrong chain", chainId: 1, txHash: "0x" + "b".repeat(64) },
  { ...base, label: "Wrong USDC token", tokenContract: "0x3333333333333333333333333333333333333333", txHash: "0x" + "c".repeat(64) },
  { ...base, label: "Transfer before finalized", txHash: "0x" + "d".repeat(64), finalityAttested: false },
  { ...base, label: "Self-funded synthetic canary", txHash: "0x" + "e".repeat(64), from: DEMO_PAYEE, source: "self_test" },
];

export const DEMO_NOTICE = "ALL SIX DEMO EVENTS ARE FICTIONAL AND NEVER OCCURRED ON ANY CHAIN.";
