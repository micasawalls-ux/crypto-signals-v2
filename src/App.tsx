import { useEffect, useState } from "react";
import type { Signal } from "./types";
import { SignalFeed } from "./SignalFeed";

interface RawRecord {
  _id: string;
  title?: string;
  direction?: string;
  currentPrice?: number;
  aiAnalysis?: string;
  _createdDate?: string;
  volumeSpikeRatio?: number;
  rsi?: number;
}

function mapRecord(record: RawRecord): Signal {
  const rawDir = (record.direction || "").toLowerCase();
  return {
    id: record._id,
    ticker: record.title ?? "UNKNOWN",
    direction:
      rawDir === "bullish" || rawDir === "bearish" || rawDir === "neutral"
        ? rawDir
        : "neutral",
    entry_price: record.currentPrice ?? 0,
    current_price: record.currentPrice ?? undefined,
    analysis: record.aiAnalysis ?? "",
    volume_spike_ratio: record.volumeSpikeRatio,
    rsi: record.rsi,
    created_at: record._createdDate ?? new Date().toISOString(),
  };
}

export default function App() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSignals() {
      try {
        const res = await fetch(`/signals.json?t=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: RawRecord[] = await res.json();
        if (!cancelled) {
          setSignals(Array.isArray(data) ? data.map(mapRecord) : []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load signals:", err);
        if (!cancelled) setLoading(false);
      }
    }

    loadSignals();
    const interval = setInterval(loadSignals, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return <SignalFeed signals={signals} isLoading={loading} />;
}
