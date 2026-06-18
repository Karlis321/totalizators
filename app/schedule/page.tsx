import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import ScheduleClient from './ScheduleClient';
import { DateSection } from './DateSection';
import { getGames, getResults } from '@/lib/sheets';
import type { DateGroup } from './types';

export const revalidate = 60;

async function getSchedule() {
  const [games, results] = await Promise.all([getGames(), getResults()]);

  const resultMap: Record<string, { actual_home: number | null; actual_away: number | null; winner: string | null }> = {};
  for (const r of results) {
    resultMap[r.game_id] = { actual_home: r.actual_home, actual_away: r.actual_away, winner: r.winner };
  }

  const byDate: Record<string, DateGroup['games']> = {};
  for (const g of games) {
    if (!byDate[g.date]) byDate[g.date] = [];
    byDate[g.date].push({
      game_id: g.game_id, date: g.date, time_eet: g.time_eet,
      home_team: g.home_team, away_team: g.away_team,
      group: g.group, round: g.round, stage: g.stage,
      result: resultMap[g.game_id] ?? null,
    });
  }

  const all: DateGroup[] = Object.keys(byDate).sort().map(date => ({ date, games: byDate[date] }));
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Riga' });

  return {
    upcoming: all.filter(d => d.date >= today),
    completed: all.filter(d => d.date < today).reverse(),
  };
}

export default async function SchedulePage() {
  const { upcoming, completed } = await getSchedule();
  const totalCompleted = completed.reduce((n, d) => n + d.games.length, 0);

  return (
    <div className="max-w-lg mx-auto pb-[78px]">
      <AppHeader />
      <h1 className="text-2xl font-bold text-grey-900 mt-6 mb-4 px-4">Spēļu Saraksts</h1>

      {upcoming.length > 0
        ? upcoming.map(dg => <DateSection key={dg.date} {...dg} />)
        : <p className="px-4 py-6 text-sm text-grey-500 text-center">Vairāk spēļu nav.</p>
      }

      {completed.length > 0 && (
        <ScheduleClient completed={completed} totalCompleted={totalCompleted} />
      )}

      <BottomNav />
    </div>
  );
}
