'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    setSlug(localStorage.getItem('member_slug'));
  }, []);

  const active = (page: string) => {
    if (page === 'leaderboard') return pathname === '/';
    if (page === 'schedule')    return pathname === '/schedule';
    if (page === 'predict')     return pathname.startsWith('/predict/');
    return false;
  };

  const tabClass = (page: string) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 text-sm font-medium transition-colors ` +
    (active(page)
      ? 'text-brand-green font-semibold border-t-2 border-brand-green'
      : 'text-grey-600 border-t-2 border-transparent');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[7] bg-white border-t border-grey-300 h-[54px] flex pb-safe">
      <Link href="/" className={tabClass('leaderboard')}>
        <span>🏆</span><span>Tabula</span>
      </Link>
      <Link href="/schedule" className={tabClass('schedule')}>
        <span>📅</span><span>Spēles</span>
      </Link>
      {slug ? (
        <Link href={`/predict/${slug}`} className={tabClass('predict')}>
          <span>⚽</span><span>Prognozes</span>
        </Link>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-0.5 text-sm text-grey-300 border-t-2 border-transparent cursor-not-allowed">
          <span>⚽</span><span>Prognozes</span>
        </div>
      )}
    </nav>
  );
}
