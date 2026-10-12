import React, { useState, useEffect } from 'react';
import { Signal } from './types';
import { SignalFeed } from './SignalFeed';

function App() {
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    fetch('/signals.json')
      .then(res => res.json())
      .then(data => setSignals(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          Crypto Signals v2
        </h1>
      </header>
      <main className="max-w-4xl mx-auto">
        <SignalFeed signals={signals} />
      </main>
    </div>
  );
}

export default App;
