'use client';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-grey-600 text-sm mb-4">Kļūda ielādējot datus. Mēģini atjaunot lapu.</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-brand-green text-white rounded-lg text-sm font-medium"
      >
        Atjaunot
      </button>
    </div>
  );
}
