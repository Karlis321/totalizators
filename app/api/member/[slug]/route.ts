import { getMember, getOpenDate, getGamesForDate, getPredictions } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const member = await getMember(slug);
    if (!member) {
      return Response.json({ error: 'Dalībnieks nav atrasts.' }, { status: 404 });
    }

    const openDate = await getOpenDate();
    if (!openDate) {
      return Response.json({ member: { id: member.id, display_name: member.display_name }, open_day: null, games: [] });
    }

    const [games, predictions] = await Promise.all([
      getGamesForDate(openDate),
      getPredictions(slug, (await getGamesForDate(openDate)).map(g => g.game_id)),
    ]);

    const predMap: Record<string, typeof predictions[0]> = {};
    for (const p of predictions) predMap[p.game_id] = p;

    const gamesWithPreds = games.map(g => ({
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

    return Response.json({
      member: { id: member.id, display_name: member.display_name },
      open_day: { date: openDate, is_locked: false },
      games: gamesWithPreds,
    });
  } catch (err) {
    console.error('[member]', err);
    return Response.json({ error: 'Servera kļūda. Mēģini vēlreiz.' }, { status: 500 });
  }
}
