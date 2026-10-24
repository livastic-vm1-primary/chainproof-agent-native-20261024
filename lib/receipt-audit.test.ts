import { describe, expect, it } from "vitest";
import { auditReceipts } from "./receipt-audit";
import { DEMO_PAYEE, DEMO_RECORDS } from "./demo-evidence";

describe("receipt audit: no invented income", () => {
  const result = auditReceipts(DEMO_PAYEE, DEMO_RECORDS);

  it("rejects duplicate chain:tx:log event ids", () => {
    expect(result.findings[1].status).toBe("duplicate");
    expect(result.summary.duplicate).toBe(1);
  });
  it("rejects a cross-chain event", () => {
    expect(result.findings[2].status).toBe("hold");
    expect(result.findings[2].reason).toMatch(/Wrong chain/);
  });
  it("rejects a non-Circle token", () => {
    expect(result.findings[3].status).toBe("hold");
    expect(result.findings[3].reason).toMatch(/Wrong token/);
  });
  it("refuses records without finality attestation", () => {
    expect(result.findings[4].status).toBe("hold");
  });
  it("does not treat a self-funded transaction as revenue", () => {
    expect(result.findings[5].status).toBe("hold");
  });
  it("counts only distinct structurally plausible transfer candidates", () => {
    expect(result.summary.candidate).toBe(1);
    expect(result.summary.hold).toBe(4);
    expect(result.summary.nominalCandidateUSDC).toBe("0.010000");
  });
  it("books no verified income without a blockchain node", () => {
    expect(result.summary.confirmedRevenueUSDC).toBe("0.000000");
    expect(result.disclaimers.join(" ")).toMatch(/does not contact a blockchain node/);
  });
  it("rejects malformed payee identities", () => {
    expect(() => auditReceipts("0xFake", DEMO_RECORDS)).toThrow();
  });
  it("does not overcount imported duplicates as positive candidates", () => {
    expect(auditReceipts(DEMO_PAYEE, [...DEMO_RECORDS, DEMO_RECORDS[0]]).summary.candidate).toBe(1);
  });
  it("caps receipt batch size", () => {
    expect(() => auditReceipts(DEMO_PAYEE, Array(101).fill(DEMO_RECORDS[0]))).toThrow();
  });
});
