import type { Signal, Direction } from "./types";
import { RichText } from "./RichText";

interface SignalFeedProps {
  signals: Signal[];
  isLoading: boolean;
}

const directionStyles: Record<Direction, string> = {
  bullish: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  bearish: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  neutral: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

function DirectionBadge({ direction }: { direction: Direction }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${directionStyles[direction]}`}>
      {direction.toUpperCase()}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/4 mb-3" />
          <div className="h-3 bg-slate-700 rounded w-full mb-2" />
          <div className="h-3 bg-slate-700 rounded w-5/6" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <p className="text-slate-400 text-sm">No signals yet.</p>
      <p className="text-slate-500 text-xs mt-1">Scanner runs hourly. Check back soon.</p>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900/50 rounded-lg px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100 mt-0.5">{value}</p>
    </div>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const pnlPct =
    signal.current_price != null && signal.entry_price > 0
      ? ((signal.current_price - signal.entry_price) / signal.entry_price) * 100
      : null;

  return (
    <article className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-colors">
      <header className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">{signal.ticker}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{formatDate(signal.created_at)}</p>
        </div>
        <DirectionBadge direction={signal.direction} />
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Entry" value={signal.entry_price} />
        <Stat label="Current" value={signal.current_price ?? "\u2014"} />
        <Stat label="RSI" value={signal.rsi ?? "\u2014"} />
        <Stat label="Vol x" value={signal.volume_spike_ratio ?? "\u2014"} />
      </div>

      {pnlPct != null && (
        <p className={`text-xs mb-3 font-medium ${pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}% from entry
        </p>
      )}

      {signal.analysis && (
        <div className="mt-3 pt-3 border-t border-slate-700/40">
          <RichText text={signal.analysis} />
        </div>
      )}
    </article>
  );
}

export function SignalFeed({ signals, isLoading }: SignalFeedProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Crypto Signals</h1>
          <p className="text-sm text-slate-400 mt-1">AI-generated momentum setups from MEXC Futures</p>
        </header>

        {isLoading ? <LoadingSkeleton /> : signals.length === 0 ? <EmptyState /> : (
          <div className="space-y-4">
            {signals.map((s) => <SignalCard key={s.id} signal={s} />)}
          </div>
        )}

        <footer className="mt-8 pt-4 border-t border-slate-800">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Educational setup only. Virtual Digital Assets are highly volatile. Not financial advice.
          </p>
        </footer>
      </div>
    </div>
  );
}
