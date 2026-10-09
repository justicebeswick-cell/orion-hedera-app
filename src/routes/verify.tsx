import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Panel, Label, SealRing } from "@/components/aurion";
import { findHashInTopic, sha256Hex, fmtTs, HASHSCAN, type TopicMsg } from "@/lib/hedera";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify a seal — AURION" },
      { name: "description", content: "Drop a file to check whether its hash was sealed on Hedera mainnet. No login." },
      { property: "og:title", content: "Verify a seal — AURION" },
      { property: "og:description", content: "Recompute the hash. Ask the mainnet mirror node. Match or no match." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Verify,
});

function Verify() {
  const [topic, setTopic] = useState("");
  const [hash, setHash] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "err" | "done">("idle");
  const [err, setErr] = useState("");
  const [hit, setHit] = useState<TopicMsg | null>(null);

  const run = async () => {
    setState("busy");
    try {
      setHit(await findHashInTopic(topic.trim(), hash));
      setState("done");
    } catch (e) {
      setErr((e as Error).message);
      setState("err");
    }
  };

  return (
    <Shell title="Verify">
      <Panel>
        <Label>Topic id</Label>
        <input className="field font-mono tnum" placeholder="0.0.123456" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <Label><span className="mt-4 block">File</span></Label>
        <input type="file" className="text-sm text-muted-foreground"
          onChange={async (e) => { const f = e.target.files?.[0]; if (f) setHash(await sha256Hex(await f.arrayBuffer())); setState("idle"); }} />
        {hash && <p className="mt-3 break-all font-mono text-xs text-signal">sha256 {hash}</p>}
        <button className="btn mt-4 w-full" disabled={!hash || !/^0\.0\.\d+$/.test(topic.trim()) || state === "busy"} onClick={run}>
          {state === "busy" ? "Reading mainnet…" : "Verify on mainnet"}
        </button>
      </Panel>

      {state === "err" && <p className="mt-4 text-sm text-destructive">{err}</p>}
      {state === "done" && (
        <Panel className="mt-4">
          {hit ? (
            <SealRing>
              <p className="text-success font-semibold">Match</p>
              <p className="mt-2 text-sm tnum">{fmtTs(hit.consensus_timestamp)}</p>
              <p className="text-xs text-muted-foreground tnum">Sequence {hit.sequence_number}</p>
              <a className="mt-3 block text-xs text-signal" target="_blank" rel="noreferrer"
                href={`${HASHSCAN}/topic/${topic.trim()}`}>View on HashScan</a>
              <p className="mt-3 text-sm font-medium">Sealed on Hedera</p>
            </SealRing>
          ) : (
            <p className="text-sm">No match. Any change to a single byte produces a different hash.</p>
          )}
        </Panel>
      )}
    </Shell>
  );
}
