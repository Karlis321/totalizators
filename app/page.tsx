import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { formatTimestampLv } from '@/lib/utils';
import { getMembers, getAllPoints } from '@/lib/sheets';

export const revalidate = 30;

async function getLeaderboard() {
  const [members, allPoints] = await Promise.all([getMembers(), getAllPoints()]);

  const totals: Record<string, number> = {};
  let last_updated = '';
  for (const row of allPoints) {
    totals[row.member_id] = (totals[row.member_id] ?? 0) + row.points;
    if (!last_updated || row.calculated_at > last_updated) last_updated = row.calculated_at;
  }

  const sorted = members
    .map(m => ({ member_id: m.id, display_name: m.display_name, total_points: totals[m.id] ?? 0 }))
    .sort((a, b) => b.total_points - a.total_points);

  let rank = 1;
  const entries = sorted.map((e, i) => {
    if (i > 0 && e.total_points < sorted[i - 1].total_points) rank = i + 1;
    return { ...e, rank };
  });

  return { last_updated, entries };
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
