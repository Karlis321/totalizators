'use client';
import RoundBadge from '@/components/RoundBadge';
import { formatDateLv } from '@/lib/utils';
import type { DateGroup, GameRow, GameResult } from './types';

function ScoreDisplay({ game }: { game: GameRow }) {
  const r: GameResult = game.result;
  if (!r) return <span className="text-grey-400 font-medium">vs</span>;
  if (game.stage === 'knockout' && r.winner) {
    return <span className="text-grey-900 font-bold text-xs leading-tight text-center">{r.winner}<br />✓</span>;
  }
  return <span className="text-grey-900 font-bold">{r.actual_home} – {r.actual_away}</span>;
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
