import React from 'react';
import { Signal } from './types';

interface SignalFeedProps {
  signals: Signal[];
}

export const SignalFeed: React.FC<SignalFeedProps> = ({ signals }) => {
  return (
    <div className="space-y-4">
      {signals.map((sig) => (
        <div key={sig.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-bold text-white">{sig.pair}</span>
            <span className={`px-2 py-1 text-xs font-bold rounded ${
              sig.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {sig.type}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm text-gray-400">
            <div>Entry: <span className="text-white font-mono">{sig.entry}</span></div>
            <div>Target: <span className="text-green-400 font-mono">{sig.target}</span></div>
            <div>Stop: <span className="text-red-400 font-mono">{sig.stopLoss}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
};
