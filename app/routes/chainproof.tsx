import { useActionMutation } from "@agent-native/core/client/hooks";
import { IconArrowRight, IconCircleCheck, IconCopy, IconDownload, IconPlayerPlay, IconShieldCheck, IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DEMO_NOTICE, DEMO_PAYEE, DEMO_RECORDS } from "../../lib/demo-evidence";
import type { ReceiptInput, AuditResponse, ReceiptResult } from "../../lib/receipt-audit";

const inputStyle = "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-xs leading-6 text-zinc-100 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25";
const labelStyle = "mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400";

function StatusMark({ finding }: { finding: ReceiptResult }) {
  const style = finding.status === "candidate"
    ? "border-teal-700 bg-teal-950 text-teal-300"
    : finding.status === "duplicate"
      ? "border-amber-800 bg-amber-950 text-amber-300"
      : "border-zinc-700 bg-zinc-800 text-zinc-300";
  const label = finding.status === "candidate" ? "REVIEW CANDIDATE"
    : finding.status === "duplicate" ? "DUPLICATE" : "HOLD";
  return <span className={"inline-flex shrink-0 items-center rounded border px-2 py-1 text-[10px] font-bold tracking-wide " + style}>{label}</span>;
}

function exportReport(result: AuditResponse) {
  const contents = JSON.stringify({
    title: "ChainProof - transfer evidence preflight",
    exportedAt: new Date().toISOString(),
    source: "User-supplied records only. NOT an onchain verification.",
    ...result,
  }, null, 2);
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chainproof-audit-unverified.json";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ChainProofRoute() {
  const [payee, setPayee] = useState(DEMO_PAYEE);
  const [rows, setRows] = useState(JSON.stringify(DEMO_RECORDS, null, 2));
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [sourceMode, setSourceMode] = useState<"demo" | "user">("demo");
  const audit = useActionMutation("audit-receipts", {
    onSuccess: (data) => {
      setResult(data);
      toast.success("Evidence preflight complete. Candidate transfers remain unverified.");
    },
    onError: () => toast.error("The audit could not process this input. Check JSON and addresses."),
  });

  function runAudit(event: FormEvent) {
    event.preventDefault();
    let parsed: unknown;
    try {
      parsed = JSON.parse(rows);
      if (!Array.isArray(parsed) || parsed.length > 100) {
        throw new Error("Expected an array of at most 100 receipt rows.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid JSON");
      return;
    }
    setResult(null);
    audit.mutate({ expectedPayee: payee.trim(), records: parsed as ReceiptInput[] });
  }

  const resultCounts = useMemo(() => {
    if (!result) return [];
    return [
      ["Evidence rows", String(result.summary.total)],
      ["Needs independent RPC", String(result.summary.candidate)],
      ["Held for review", String(result.summary.hold)],
      ["Duplicates rejected", String(result.summary.duplicate)],
    ];
  }, [result]);

  return (
    <main className="min-h-full bg-[#101317] px-4 pb-20 pt-8 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border border-teal-800 bg-teal-950 text-teal-300"><IconShieldCheck size={25} stroke={1.8}/></div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-300">CHAINPROOF / LAB 01</div>
              <h1 className="text-2xl font-semibold tracking-tight">Receipt evidence workbench</h1>
            </div>
          </div>
          <Link to="/chat" className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-teal-500">
            Ask the agent about this evidence <IconArrowRight size={15}/>
          </Link>
        </div>

        <div className="my-6 flex flex-wrap items-center gap-3 rounded-lg border border-amber-800/70 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          <IconAlertTriangle size={18} className="shrink-0 text-amber-300"/>
          <span><strong>Safety boundary:</strong> no wallet signatures, API keys, chain RPC, or payment calls. Input attestations are untrusted. This cannot prove money arrived.</span>
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section aria-label="Evidence input" className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold">01 / Inspect transfer records</h2>
              <button type="button" className="flex items-center gap-2 text-xs text-zinc-400 underline-offset-4 hover:text-teal-300 hover:underline"
                onClick={() => { setPayee(DEMO_PAYEE); setRows(JSON.stringify(DEMO_RECORDS, null, 2)); setResult(null); setSourceMode("demo"); }}
              ><IconRefresh size={15}/> Reset example</button>
            </div>
            <form onSubmit={runAudit} className="space-y-5">
              <div>
                <label htmlFor="expected-payee" className={labelStyle}>Expected Base USDC payee</label>
                <input id="expected-payee" className={inputStyle} value={payee} spellCheck={false} onChange={(e) => { setPayee(e.target.value); setResult(null); setSourceMode("user"); }} />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="records-json" className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">ERC-20 event JSON</label>
                  <span className="text-[11px] text-zinc-500">up to 100 entries / local entry</span>
                </div>
                <textarea id="records-json" spellCheck={false} value={rows}
                  onChange={(e) => { setRows(e.target.value); setResult(null); setSourceMode("user"); }}
                  className={inputStyle + " min-h-[340px] resize-y sm:min-h-[450px]"} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-zinc-400">{sourceMode === "demo" ? DEMO_NOTICE : "Only submit data you are authorized to inspect."}</span>
                <Button type="submit" disabled={audit.isPending} className="gap-2 bg-teal-400 text-zinc-950 hover:bg-teal-300 disabled:opacity-60">
                  <IconPlayerPlay size={16}/>{audit.isPending ? "Checking inputs..." : "Audit evidence"}
                </Button>
              </div>
            </form>
          </section>

          <section aria-label="Audit results" className="min-w-0">
            {result ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.17em] text-zinc-400">02 / Readout</div>
                      <div className="mt-1 text-base font-semibold">No settled revenue proven</div>
                    </div>
                    <IconCircleCheck size={21} className="text-teal-300"/>
                  </div>
                  <p className="mt-4 font-mono text-3xl font-semibold tracking-tight text-teal-200">0.000000 <span className="text-base text-zinc-400">USDC</span></p>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">Confirmed income is zero by design. Only an independent chain check and owner-wide ledger reconciliation can change that.</p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {resultCounts.map(([label, value]) => <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3" key={label}>
                      <div className="text-[11px] text-zinc-400">{label}</div>
                      <div className="mt-1 font-mono text-xl text-zinc-100">{value}</div>
                    </div>)}
                  </div>
                  <p className="mt-4 font-mono text-xs text-zinc-300">Nominal candidate sum: {result.summary.nominalCandidateUSDC} USDC (unverified)</p>
                  <Button type="button" variant="outline" onClick={() => exportReport(result)} className="mt-5 w-full gap-2 border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"><IconDownload size={16}/> Export evidence report</Button>
                </div>
                <div className="overflow-hidden rounded-xl border border-zinc-800">
                  <div className="border-b border-zinc-800 bg-zinc-900 px-5 py-4 text-sm font-semibold">Per-event decisions</div>
                  <div className="max-h-[600px] divide-y divide-zinc-800 overflow-y-auto bg-[#171b20]">
                    {result.findings.map((finding) => <article key={finding.inputIndex} className="space-y-2 px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="min-w-0 truncate text-sm font-medium">{finding.label}</h3>
                        <StatusMark finding={finding}/>
                      </div>
                      <p className="font-mono text-[11px] text-zinc-400">{finding.amountUSDC} USDC / {finding.source}</p>
                      <p className="text-xs leading-5 text-zinc-300">{finding.reason}</p>
                    </article>)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[490px] flex-col justify-center rounded-xl border border-dashed border-zinc-700 bg-[#171b20] px-8 text-center">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-teal-300"><IconCopy size={26}/></div>
                <h2 className="text-lg font-semibold">Evidence first. Revenue last.</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">
                  Run the sample to see duplicate transaction rows, wrong chain and token contracts, missing finality, and internal transfers classified by the same action that the agent can call.
                </p>
                <p className="mx-auto mt-5 max-w-xs font-mono text-xs text-zinc-500">No on-chain calls / No signatures / No invented payouts</p>
              </div>
            )}
          </section>
        </div>
        <div className="mt-7 rounded-lg border border-zinc-800 p-4 text-xs leading-5 text-zinc-400">
          <strong className="text-zinc-200">How this works</strong>: the UI calls the Agent-Native audit-receipts action, exposed to its agent, CLI, MCP and HTTP with the same validation and deduplication rules. It does not talk to Ethereum or trust an explorer link as proof. No raw wallet private keys are necessary.
        </div>
      </div>
    </main>
  );
}
