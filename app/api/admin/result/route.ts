export const dynamic = 'force-dynamic';

import { requireAdmin } from '@/lib/auth';
import { getGames, getMembers, getPredictions, upsertResult, upsertPoints, getScoringConfig } from '@/lib/sheets';
import { calculatePoints } from '@/lib/scoring';

export async function POST(request: Request) {
  const err = requireAdmin(request);
  if (err) return err;

  try {
    const body = await request.json() as {
      game_id: string;
      actual_home: number | null;
      actual_away: number | null;
      winner: string | null;
    };

    const { game_id, actual_home, actual_away, winner } = body;

    // Find the game
    const games = await getGames();
    const game = games.find(g => g.game_id === game_id);
    if (!game) return Response.json({ error: 'Spēle nav atrasta.' }, { status: 404 });

    // Validate result values
    if (game.stage === 'group') {
      if (actual_home == null || actual_away == null ||
          !Number.isInteger(actual_home) || !Number.isInteger(actual_away) ||
          actual_home < 0 || actual_home > 20 ||
          actual_away < 0 || actual_away > 20) {
        return Response.json({ error: 'Nederīgas vērtības.' }, { status: 422 });
      }
    } else {
      if (!winner || (winner !== game.home_team && winner !== game.away_team)) {
        return Response.json({ error: 'Nederīgs uzvarētājs.' }, { status: 422 });
      }
    }

    const entered_at = new Date().toISOString();

    // Write result
    await upsertResult({ game_id, actual_home, actual_away, winner, entered_at });

    // Calculate points for all 8 members
    const [members, config] = await Promise.all([getMembers(), getScoringConfig()]);
    const allRows = await Promise.all(
      members.map(m => getPredictions(m.id, [game_id]))
    );

    const result = { actual_home, actual_away, winner };
    const points_calculated: { member_id: string; points: number }[] = [];

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const pred = allRows[i][0] ?? null;

      const prediction = pred ? (
        game.stage === 'group'
          ? { home_score: pred.home_score!, away_score: pred.away_score! }
          : { winner_pick: pred.winner_pick! }
      ) : null;

      const pts = calculatePoints(game.stage as 'group' | 'knockout', prediction, result as { actual_home: number; actual_away: number } | { winner: string }, config);
      await upsertPoints(m.id, game_id, pts);
      points_calculated.push({ member_id: m.id, points: pts });
    }

    return Response.json({ success: true, game_id, points_calculated });
  } catch (err) {
    console.error('[admin/result]', err);
    return Response.json({ error: 'Servera kļūda. Mēģini vēlreiz.' }, { status: 500 });
  }
}
