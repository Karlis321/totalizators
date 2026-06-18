import PointsBadge from '@/components/PointsBadge';
import { formatDateShortLv, pointsLabel } from '@/lib/utils';

type HistoryData = {
  total_points: number;
  history: {
    date: string;
    games: {
      game_id: string; home_team: string; away_team: string; stage: string;
      prediction: { home_score: number | null; away_score: number | null; winner_pick: string | null } | null;
      result: { actual_home: number | null; actual_away: number | null; winner: string | null } | null;
      points: number | null;
    }[];
  }[];
};

function predictionText(
  pred: HistoryData['history'][0]['games'][0]['prediction']
): string {
  if (!pred) return 'Nav prognozes';
  return `${pred.home_score}–${pred.away_score}`;
}

function resultText(
  res: NonNullable<HistoryData['history'][0]['games'][0]['result']>
): string {
  const score = `${res.actual_home}–${res.actual_away}`;
  return res.winner ? `${score} (${res.winner})` : score;
}

export default function HistorySection({ historyData }: { historyData: HistoryData }) {
  const { total_points, history } = historyData;

  return (
    <div className="mt-8">
      <div className="border-t border-grey-200 mx-4 mb-6" />
      <h2 className="text-xl font-bold text-grey-900 px-4 mb-4">Manas Prognozes</h2>

      {history.length === 0 ? (
        <p className="text-sm text-grey-500 px-4 mt-4">Vēl nav iesniegtu prognožu.</p>
      ) : (
        <>
          {history.map(({ date, games }) => (
            <div key={date}>
              <p className="text-sm font-semibold text-grey-600 px-4 mb-2 mt-4">{formatDateShortLv(date)}</p>
              {games.map(g => (
                <div key={g.game_id} className="px-4 py-3 border-b border-grey-100 flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-grey-900">{g.home_team} vs {g.away_team}</p>
                    <p className="text-sm text-grey-600">
                      Mana prognoze: {predictionText(g.prediction)}
                    </p>
                    <p className="text-sm text-grey-600">
                      Rezultāts: {g.result ? resultText(g.result) : 'Gaida rezultātu'}
                    </p>
                  </div>
                  <PointsBadge points={g.points} />
                </div>
              ))}
            </div>
          ))}

          <p className="text-base font-bold text-grey-900 px-4 mt-4">
            Kopā: {pointsLabel(total_points)}
          </p>
        </>
      )}
    </div>
  );
}
