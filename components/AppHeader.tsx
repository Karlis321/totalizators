'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AppHeader() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(localStorage.getItem('member_display_name'));
  }, []);

  function handleExit() {
    localStorage.removeItem('member_slug');
    localStorage.removeItem('member_display_name');
    router.push('/');
    router.refresh();
    // Re-show picker by reloading
    window.location.href = '/';
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-grey-300 h-14 flex items-center justify-between px-4">
      <span className="font-semibold text-grey-900 text-lg">⚽ Totalizators</span>
      {displayName && (
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 text-sm text-grey-600 border border-grey-200 rounded-full px-3 py-1 active:bg-grey-100"
        >
          <span className="font-medium text-grey-900">{displayName}</span>
          <span className="text-grey-400 text-xs">✕</span>
        </button>
      )}
    </header>
  );
}
