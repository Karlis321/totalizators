import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import RoundBadge from '@/components/RoundBadge';
import ScheduleClient from './ScheduleClient';
import { formatDateLv } from '@/lib/utils';
import { getGames, getResults } from '@/lib/sheets';

export const revalidate = 300;

type GameResult = { actual_home: number | null; actual_away: number | null; winner: string | null } | null;
export type GameRow = {
  game_id: string; date: string; time_eet: string; home_team: string; away_team: string;
  group: string; round: string; stage: string; result: GameResult;
};
export type DateGroup = { date: string; games: GameRow[] };

async function getSchedule() {
  const [games, results] = await Promise.all([getGames(), getResults()]);
  const resultMap: Record<string, GameResult> = {};
  for (const r of results) {
    resultMap[r.game_id] = { actual_home: r.actual_home, actual_away: r.actual_away, winner: r.winner };
  }

  const byDate: Record<string, GameRow[]> = {};
  for (const g of games) {
    if (!byDate[g.date]) byDate[g.date] = [];
    byDate[g.date].push({
      game_id: g.game_id, date: g.date, time_eet: g.time_eet,
      home_team: g.home_team, away_team: g.away_team,
      group: g.group, round: g.round, stage: g.stage,
      result: resultMap[g.game_id] ?? null,
    });
  }

  const schedule: DateGroup[] = Object.keys(byDate).sort().map(date => ({ date, games: byDate[date] }));

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Riga' });
  const upcoming: DateGroup[] = schedule.filter(d => d.date >= today);
  const completed: DateGroup[] = schedule.filter(d => d.date < today).reverse(); // newest first

  return { upcoming, completed };
}

export function ScoreDisplay({ game }: { game: GameRow }) {
  if (!game.result) return <span className="text-grey-400 font-medium">vs</span>;
  if (game.stage === 'knockout' && game.result.winner) {
    return <span className="text-grey-900 font-bold text-xs leading-tight text-center">{game.result.winner}<br />✓</span>;
  }
  return (
    <span className="text-grey-900 font-bold">
      {game.result.actual_home} – {game.result.actual_away}
    </span>
  );
}

export function DateSection({ date, games }: DateGroup) {
  const rounds = Array.from(new Set(games.map(g => g.round)));
  return (
    <div className="mb-4">
      <div className="sticky top-[56px] z-10 bg-grey-100 px-4 py-2.5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-grey-900">{formatDateLv(date)}</span>
        {rounds.map(r => {
          const group = games.find(g => g.round === r)?.group ?? '';
          return <RoundBadge key={r} round={r} group={group} />;
        })}
      </div>
      {games.map(game => (
        <div key={game.game_id} className="px-4 py-3 flex items-center border-b border-grey-100 gap-2">
          <span className="text-sm text-grey-500 w-12 flex-shrink-0">{game.time_eet}</span>
          <span className={`text-sm font-medium flex-1 text-right truncate ${game.result ? 'text-grey-500' : 'text-grey-900'}`}>
            {game.home_team}
          </span>
          <span className="text-sm w-20 text-center flex-shrink-0 flex items-center justify-center">
            <ScoreDisplay game={game} />
          </span>
          <span className={`text-sm font-medium flex-1 truncate ${game.result ? 'text-grey-500' : 'text-grey-900'}`}>
            {game.away_team}
          </span>
          <span className="flex-shrink-0">
            <RoundBadge round={game.round} group={game.group} />
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function SchedulePage() {
  const { upcoming, completed } = await getSchedule();
  const totalCompleted = completed.reduce((n, d) => n + d.games.length, 0);

  return (
    <div className="max-w-lg mx-auto pb-[78px]">
      <AppHeader />
      <h1 className="text-2xl font-bold text-grey-900 mt-6 mb-4 px-4">Spēļu Saraksts</h1>

      {/* ── Upcoming ───────────────────────────────────────── */}
      {upcoming.length > 0 ? (
        upcoming.map(dg => <DateSection key={dg.date} {...dg} />)
      ) : (
        <p className="px-4 py-6 text-sm text-grey-500 text-center">Vairāk spēļu nav.</p>
      )}

      {/* ── Completed (collapsible) ────────────────────────── */}
      {completed.length > 0 && (
        <ScheduleClient completed={completed} totalCompleted={totalCompleted} />
      )}

      <BottomNav />
    </div>
  );
}
