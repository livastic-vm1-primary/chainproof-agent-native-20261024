/** Pure, deterministic screening of user-supplied ERC-20 transfer evidence.
 * This DOES NOT make RPC calls, prove finality or book income.
 */
export const BASE_CHAIN_ID = 8453;
export const BASE_CIRCLE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

export type ReceiptInput = {
  label: string;
  chainId: number;
  tokenContract: string;
  txHash: string;
  logIndex: number;
  from: string;
  to: string;
  amountAtomic: string;
  source: "customer" | "marketplace_operator" | "bounty" | "self_test";
  finalityAttested: boolean;
  erc20TransferAttested: boolean;
};

export type ReceiptResult = {
  inputIndex: number;
  label: string;
  id: string;
  status: "candidate" | "hold" | "duplicate";
  reason: string;
  amountUSDC: string;
  source: ReceiptInput["source"];
};

export type AuditResponse = {
  summary: {
    total: number;
    candidate: number;
    hold: number;
    duplicate: number;
    nominalCandidateUSDC: string;
    confirmedRevenueUSDC: "0.000000";
    chain: "Base (8453)";
    token: "native Circle USDC";
  };
  findings: ReceiptResult[];
  disclaimers: string[];
};

const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const TRANSACTION = /^0x[a-fA-F0-9]{64}$/;
const DECIMAL_INTEGER = /^\d{1,36}$/;
const SCALE = 1000000n;

function usd(amount: bigint): string {
  const whole = amount / SCALE;
  const fraction = (amount % SCALE).toString().padStart(6, "0");
  return whole.toString() + "." + fraction;
}

export function auditReceipts(expectedPayee: string, records: ReceiptInput[]): AuditResponse {
  if (!ADDRESS.test(expectedPayee)) {
    throw new Error("The expected Base recipient must be a full 0x plus 40-hex address.");
  }
  if (records.length > 100) throw new Error("At most 100 receipt rows per batch.");
  const payee = expectedPayee.toLowerCase();
  const seen = new Set<string>();
  const findings: ReceiptResult[] = [];
  let candidate = 0;
  let duplicate = 0;
  let hold = 0;
  let nominal = 0n;

  for (const [index, record] of records.entries()) {
    const validHash = TRANSACTION.test(record.txHash);
    const validLog = Number.isInteger(record.logIndex) && record.logIndex >= 0;
    const canonicalId = validHash && validLog
      ? String(record.chainId) + ":" + record.txHash.toLowerCase() + ":" + String(record.logIndex)
      : "invalid-event-row-" + String(index + 1);
    const validAtomic = DECIMAL_INTEGER.test(record.amountAtomic) && BigInt(record.amountAtomic) > 0n;
    const amount = validAtomic ? BigInt(record.amountAtomic) : 0n;
    let reason = "";
    let status: ReceiptResult["status"] = "hold";

    if (seen.has(canonicalId)) {
      status = "duplicate";
      reason = "Same chain, transaction hash and log index already appeared. Never book twice.";
      duplicate++;
    } else {
      seen.add(canonicalId);
      if (record.chainId !== BASE_CHAIN_ID) {
        reason = "Wrong chain. This workbench accepts Base mainnet (8453) only.";
      } else if (record.tokenContract.toLowerCase() !== BASE_CIRCLE_USDC) {
        reason = "Wrong token contract. A similarly named bridged token is not native Circle USDC.";
      } else if (!ADDRESS.test(record.to) || record.to.toLowerCase() !== payee) {
        reason = "Transfer receiver is not the expected payee.";
      } else if (!ADDRESS.test(record.from) || record.from.toLowerCase() === payee) {
        reason = "Invalid sender or a self-transfer, not external income.";
      } else if (!validHash || !validLog || !validAtomic) {
        reason = "Transaction hash, log index, or positive six-decimal token amount is invalid.";
      } else if (record.source === "self_test") {
        reason = "Synthetic/self-funded record. It is not independent customer revenue.";
      } else if (!record.erc20TransferAttested || !record.finalityAttested) {
        reason = "Missing an asserted ERC-20 Transfer event or chain finality; request source proof.";
      } else {
        status = "candidate";
        reason = "Structurally plausible external transfer. STILL requires independent RPC confirmation and owner-wide ledger deduplication.";
        candidate++;
        nominal += amount;
      }
      if (status === "hold") hold++;
    }
    findings.push({
      inputIndex: index, label: record.label || "Record " + String(index + 1),
      id: canonicalId, status, reason, amountUSDC: usd(amount), source: record.source,
    });
  }

  return {
    summary: {
      total: records.length, candidate, hold, duplicate,
      nominalCandidateUSDC: usd(nominal),
      confirmedRevenueUSDC: "0.000000",
      chain: "Base (8453)", token: "native Circle USDC",
    },
    findings,
    disclaimers: [
      "User-supplied attestation flags can be false. This tool does not contact a blockchain node or verify transaction inclusion or finality.",
      "Candidate totals are hypothetical gross transfer amounts, not paid sales, spendable wallet balance, realized income or net profit.",
      "Before booking a payout, independently inspect a canonical ERC-20 Transfer log, finalized block, sender, token, owner-wide duplicate ledger and all fees.",
    ],
  };
}
