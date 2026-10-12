export type Direction = "bullish" | "bearish" | "neutral";

export interface Signal {
  id: string;
  ticker: string;
  direction: Direction;
  entry_price: number;
  current_price?: number;
  analysis: string;
  volume_spike_ratio?: number;
  rsi?: number;
  created_at: string;
}
