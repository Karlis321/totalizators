'use client';
import { useState, FormEvent } from 'react';

export default function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/status', {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.status === 401) {
        setError('Nepareiza parole.');
        setPassword('');
      } else if (res.ok) {
        onLogin(password);
      } else {
        setError('Servera kļūda. Mēģini vēlreiz.');
      }
    } catch {
      setError('Savienojuma kļūda. Mēģini vēlreiz.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-grey-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-grey-200 p-8 w-full max-w-sm">
        <div className="text-centre mb-6">
          <p className="text-4xl text-center">⚽</p>
          <h1 className="text-2xl font-bold text-grey-900 text-center mt-2">Totalizators</h1>
          <p className="text-sm text-grey-600 text-center mt-1">Admin panelis</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-grey-700 mb-1">Parole</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            className={`w-full h-11 border rounded-lg px-3 text-sm outline-none transition-colors ${
              error ? 'border-red-500' : 'border-grey-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20'
            }`}
          />
          {error && <p className="text-sm text-red-600 text-center mt-2">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full h-11 bg-brand-green text-white rounded-lg font-semibold text-sm mt-4 disabled:opacity-50"
          >
            {loading ? '...' : 'Ieiet'}
          </button>
        </form>
      </div>
    </div>
  );
}
