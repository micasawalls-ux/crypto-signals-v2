export interface Signal {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entry: number;
  target: number;
  stopLoss: number;
  timestamp: string;
  status: 'PENDING' | 'ACTIVE' | 'TARGET_HIT' | 'STOP_HIT';
  notes?: string;
}
