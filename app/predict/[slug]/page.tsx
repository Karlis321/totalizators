import { notFound } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import PredictForm from './PredictForm';
import HistorySection from './HistorySection';
import { formatDateLv } from '@/lib/utils';
import {
  getMember, getOpenDate, getGamesForDate,
  getGames, getResults, getAllPredictionsForMember, getPointsForMember,
} from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export default async function PredictPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const member = await getMember(slug);
  if (!member) notFound();

  const [openDate, allGames, results, predictions, memberPoints] = await Promise.all([
    getOpenDate(),
    getGames(),
    getResults(),
    getAllPredictionsForMember(slug),
    getPointsForMember(slug),
  ]);

  // ── Open day games + predictions ──
  const openGames = openDate ? await getGamesForDate(openDate) : [];
  const predMap: Record<string, typeof predictions[0]> = {};
  for (const p of predictions) predMap[p.game_id] = p;

  const gamesWithPreds = openGames.map(g => ({
    ...g,
    prediction: predMap[g.game_id]
      ? {
          home_score: predMap[g.game_id].home_score,
          away_score: predMap[g.game_id].away_score,
          winner_pick: predMap[g.game_id].winner_pick,
          submitted_at: predMap[g.game_id].submitted_at,
        }
      : null,
  }));

  const alreadySubmitted = gamesWithPreds.length > 0 && gamesWithPreds.every(g => g.prediction !== null);

  // ── History ──
  const resultMap: Record<string, typeof results[0]> = {};
  for (const r of results) resultMap[r.game_id] = r;

  const pointsMap: Record<string, number> = {};
  for (const p of memberPoints) pointsMap[p.game_id] = p.points;

  const pastGames = allGames
    .filter(g => resultMap[g.game_id])
    .sort((a, b) => b.date.localeCompare(a.date));

  const dateMap: Record<string, typeof pastGames> = {};
  for (const g of pastGames) {
    if (!dateMap[g.date]) dateMap[g.date] = [];
    dateMap[g.date].push(g);
  }

  const history = Object.entries(dateMap).map(([date, gms]) => ({
    date,
    games: gms.map(g => {
      const pred = predMap[g.game_id] ?? null;
      const res = resultMap[g.game_id];
      return {
        game_id: g.game_id,
        home_team: g.home_team,
        away_team: g.away_team,
        stage: g.stage,
        prediction: pred ? {
          home_score: pred.home_score,
          away_score: pred.away_score,
          winner_pick: pred.winner_pick,
        } : null,
        result: {
          actual_home: res.actual_home,
          actual_away: res.actual_away,
          winner: res.winner,
        },
        points: pointsMap[g.game_id] ?? null,
      };
    }),
  }));

  const total_points = memberPoints.reduce((sum, p) => sum + p.points, 0);

  return (
    <div className="max-w-lg mx-auto pb-32">
      <AppHeader />

      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-grey-900">Sveiks, {member.display_name}! 👋</h1>
        <p className="text-sm text-grey-600 mt-1">FIFA World Cup 2026 Totalizators</p>
      </div>

      {openDate ? (
        <>
          <div className="px-4 mb-3">
            <p className="text-lg font-semibold text-grey-900">{formatDateLv(openDate)}</p>
            <p className="text-sm text-grey-600">Ievadi savas prognozes</p>
          </div>
          <PredictForm slug={slug} games={gamesWithPreds} alreadySubmitted={alreadySubmitted} />
        </>
      ) : (
        <div className="mx-4 mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
          Nav atvērta neviena diena prognozēšanai.
        </div>
      )}

      <HistorySection historyData={{ total_points, history }} />

      <BottomNav />
    </div>
  );
}
