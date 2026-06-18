import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { formatTimestampLv } from '@/lib/utils';

export const revalidate = 30;

async function getLeaderboard() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/leaderboard`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error('leaderboard fetch failed');
  return res.json() as Promise<{
    last_updated: string;
    entries: { rank: number; member_id: string; display_name: string; total_points: number }[];
  }>;
}

export default async function LeaderboardPage() {
  const data = await getLeaderboard();
  const { last_updated, entries } = data;
  const anyPoints = entries.some(e => e.total_points > 0);

  return (
    <div className="max-w-lg mx-auto pb-[78px]">
      <AppHeader />

      <h1 className="text-2xl font-bold text-grey-900 mt-6 mb-1 px-4">Tabula</h1>
      <p className="text-xs text-grey-600 mb-4 px-4">
        Pēdējo reizi atjaunināts: {formatTimestampLv(last_updated)}
      </p>

      <div className="px-4">
        {/* Table header */}
        <div className="flex items-center py-2 border-b border-grey-300 text-xs font-semibold text-grey-600 uppercase tracking-wide">
          <span className="w-12 text-center">Vieta</span>
          <span className="flex-1">Dalībnieks</span>
          <span className="w-16 text-center">Punkti</span>
        </div>

        {/* Rows */}
        {entries.map(e => {
          const isLeader = e.rank === 1 && anyPoints;
          return (
            <div
              key={e.member_id}
              className={`flex items-center h-14 border-b border-grey-100 cursor-default ${
                isLeader ? 'bg-brand-gold-light border-l-[3px] border-l-brand-gold' : ''
              }`}
            >
              <span className={`w-12 text-center text-lg font-bold ${isLeader ? 'text-brand-gold' : 'text-grey-900'}`}>
                {e.rank}
              </span>
              <span className="flex-1 text-base font-medium text-grey-900">
                {isLeader && '🏆 '}{e.display_name}
              </span>
              <span className={`w-16 text-center text-lg font-bold ${isLeader ? 'text-brand-gold' : 'text-grey-900'}`}>
                {e.total_points}
              </span>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
