import type { ScoringConfig } from './sheets';

type ScorePrediction = { home_score: number; away_score: number };
type ScoreResult     = { actual_home: number; actual_away: number; winner?: string | null };
type GameInfo        = { home_team: string; away_team: string };

export function calculateGroupPoints(
  prediction: ScorePrediction,
  result: ScoreResult,
  config: ScoringConfig
): number {
  const { home_score, away_score } = prediction;
  const { actual_home, actual_away } = result;

  if (home_score === actual_home && away_score === actual_away) {
    return config.pts_exact; // 4
  }

  let pts = 0;

  // Correct outcome (home win / draw / away win)
  const predOutcome = Math.sign(home_score - away_score);
  const actlOutcome = Math.sign(actual_home - actual_away);
  if (predOutcome === actlOutcome) pts += config.pts_correct_winner; // 1

  // At least one team's score exactly right
  if (home_score === actual_home || away_score === actual_away) {
    pts += config.pts_one_team; // 1
  }

  return pts;
}

export function calculateKnockoutPoints(
  prediction: ScorePrediction,
  result: ScoreResult,
  game: GameInfo,
  config: ScoringConfig
): number {
  const { home_score, away_score } = prediction;
  const { actual_home, actual_away, winner } = result;

  if (home_score === actual_home && away_score === actual_away) {
    return config.pts_knockout_exact; // 3
  }

  let pts = 0;

  // Actual winner: from score if decisive, else from winner field (penalty tiebreak)
  const actualWinner = actual_home > actual_away ? game.home_team
    : actual_away > actual_home ? game.away_team
    : (winner ?? null);

  // Predicted winner: from predicted score (null if predicted draw — can't determine penalty winner)
  const predWinner = home_score > away_score ? game.home_team
    : away_score > home_score ? game.away_team
    : null;

  if (predWinner !== null && predWinner === actualWinner) {
    pts += config.pts_knockout_winner; // 1
  }

  // At least one team's score exactly right
  if (home_score === actual_home || away_score === actual_away) {
    pts += config.pts_knockout_one_team; // 1
  }

  return pts;
}

export function calculatePoints(
  stage: 'group' | 'knockout',
  prediction: ScorePrediction | null,
  result: ScoreResult,
  game: GameInfo,
  config: ScoringConfig
): number {
  if (!prediction) return 0;
  if (stage === 'group') {
    return calculateGroupPoints(prediction, result, config);
  }
  return calculateKnockoutPoints(prediction, result, game, config);
}
