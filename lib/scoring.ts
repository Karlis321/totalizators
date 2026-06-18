import type { ScoringConfig } from './sheets';

type GroupPrediction = { home_score: number; away_score: number };
type GroupResult     = { actual_home: number; actual_away: number };
type KnockoutPrediction = { winner_pick: string };
type KnockoutResult     = { winner: string };

export function calculateGroupPoints(
  prediction: GroupPrediction,
  result: GroupResult,
  config: ScoringConfig
): number {
  const predWinner = Math.sign(prediction.home_score - prediction.away_score);
  const actlWinner = Math.sign(result.actual_home - result.actual_away);
  const predDiff   = prediction.home_score - prediction.away_score;
  const actlDiff   = result.actual_home - result.actual_away;

  if (prediction.home_score === result.actual_home &&
      prediction.away_score === result.actual_away) {
    return config.pts_exact;
  }
  if (predWinner !== actlWinner) {
    return config.pts_wrong;
  }
  if (predDiff === actlDiff) {
    return config.pts_correct_diff;
  }
  return config.pts_correct_winner;
}

export function calculateKnockoutPoints(
  prediction: KnockoutPrediction,
  result: KnockoutResult,
  config: ScoringConfig
): number {
  return prediction.winner_pick === result.winner
    ? config.pts_knockout_correct
    : config.pts_knockout_wrong;
}

export function calculatePoints(
  stage: 'group' | 'knockout',
  prediction: GroupPrediction | KnockoutPrediction | null,
  result: GroupResult | KnockoutResult,
  config: ScoringConfig
): number {
  if (!prediction) return 0;
  if (stage === 'group') {
    return calculateGroupPoints(
      prediction as GroupPrediction,
      result as GroupResult,
      config
    );
  }
  return calculateKnockoutPoints(
    prediction as KnockoutPrediction,
    result as KnockoutResult,
    config
  );
}
