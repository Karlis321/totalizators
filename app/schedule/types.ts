// Shared types and pure UI helpers — no server imports, safe to use in client components

export type GameResult = { actual_home: number | null; actual_away: number | null; winner: string | null } | null;

export type GameRow = {
  game_id: string; date: string; time_eet: string; home_team: string; away_team: string;
  group: string; round: string; stage: string; result: GameResult;
};

export type DateGroup = { date: string; games: GameRow[] };
