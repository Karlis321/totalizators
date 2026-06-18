import { getMember, getGames, getResults, getAllPredictionsForMember, getPointsForMember } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const member = await getMember(slug);
    if (!member) {
      return Response.json({ error: 'Dalībnieks nav atrasts.' }, { status: 404 });
    }

    const [games, results, predictions, memberPoints] = await Promise.all([
      getGames(), getResults(), getAllPredictionsForMember(slug), getPointsForMember(slug),
    ]);

    const resultMap: Record<string, typeof results[0]> = {};
    for (const r of results) resultMap[r.game_id] = r;

    const predMap: Record<string, typeof predictions[0]> = {};
    for (const p of predictions) predMap[p.game_id] = p;

    const pointsMap: Record<string, number> = {};
    for (const p of memberPoints) pointsMap[p.game_id] = p.points;

    // Only past games (have a result), sorted by date desc
    const pastGames = games
      .filter(g => resultMap[g.game_id])
      .sort((a, b) => b.date.localeCompare(a.date));

    // Group by date
    const dateMap: Record<string, typeof pastGames> = {};
    for (const g of pastGames) {
      if (!dateMap[g.date]) dateMap[g.date] = [];
      dateMap[g.date].push(g);
    }

    const history = Object.entries(dateMap).map(([date, gms]) => ({
      date,
      games: gms.map(g => {
        const pred = predMap[g.game_id] ?? null;
        const res  = resultMap[g.game_id];
        return {
          game_id: g.game_id,
          home_team: g.home_team, away_team: g.away_team,
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

    return Response.json({
      member: { id: member.id, display_name: member.display_name },
      total_points,
      history,
    });
  } catch (err) {
    console.error('[history]', err);
    return Response.json({ error: 'Servera kļūda. Mēģini vēlreiz.' }, { status: 500 });
  }
}
