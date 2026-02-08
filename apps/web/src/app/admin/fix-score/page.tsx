'use client';

import { useState } from 'react';

export default function FixScorePage() {
  const [oldScore, setOldScore] = useState('3:11');
  const [newScore, setNewScore] = useState('3:1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runFix = async (dryRun: boolean) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/fix-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldScore, newScore, dryRun }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Oprava skore</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Spatne skore</label>
              <input
                type="text"
                value={oldScore}
                onChange={(e) => setOldScore(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="3:11"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Spravne skore</label>
              <input
                type="text"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="3:1"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => runFix(true)}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded font-medium disabled:opacity-50"
            >
              {loading ? 'Nacitam...' : 'Nahled (bez zmeny)'}
            </button>
            <button
              onClick={() => runFix(false)}
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium disabled:opacity-50"
            >
              {loading ? 'Ukladam...' : 'Opravit'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {result.dryRun ? 'Nahled zmen' : 'Vysledek'}
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div className="bg-gray-700 rounded p-3">
                <span className="text-gray-400">Nalezeno videi:</span>
                <span className="ml-2 font-bold">{result.videosFound}</span>
              </div>
              {!result.dryRun && (
                <>
                  <div className="bg-gray-700 rounded p-3">
                    <span className="text-gray-400">Opraveno videi:</span>
                    <span className="ml-2 font-bold text-green-400">{result.videosUpdated}</span>
                  </div>
                  <div className="bg-gray-700 rounded p-3">
                    <span className="text-gray-400">Opraveno zapasu:</span>
                    <span className="ml-2 font-bold text-green-400">{result.matchesUpdated}</span>
                  </div>
                </>
              )}
            </div>

            {result.changes?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Zmeny:</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.changes.map((change: any, i: number) => (
                    <div key={i} className="bg-gray-700 rounded p-2 text-sm">
                      <span className="text-gray-400">[{change.type}]</span>
                      <div className="text-red-400 line-through">{change.before}</div>
                      <div className="text-green-400">{change.after}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
