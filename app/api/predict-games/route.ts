import { getMember, getOpenDates, getGamesForDates, getPredictions } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) return Response.json({ error: 'Missing slug' }, { status: 400 });

    const member = await getMember(slug);
    if (!member) return Response.json({ error: 'Not found' }, { status: 404 });

    const openDates = await getOpenDates();
    if (openDates.length === 0) return Response.json({ games: [] });

    const games = await getGamesForDates(openDates);
    const predictions = await getPredictions(slug, games.map(g => g.game_id));

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

    return Response.json({ games: gamesWithPreds });
  } catch (err) {
    console.error('[predict-games]', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
