import { getMember, getOpenDate, getGamesForDate, upsertPrediction } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, predictions } = body as {
      member_id: string;
      predictions: { game_id: string; home_score: number | null; away_score: number | null; winner_pick: string | null }[];
    };

    if (!member_id || !Array.isArray(predictions)) {
      return Response.json({ error: 'Nederīgs pieprasījums.' }, { status: 400 });
    }

    // Validate member
    const member = await getMember(member_id);
    if (!member) return Response.json({ error: 'Dalībnieks nav atrasts.' }, { status: 404 });

    // Validate day is open
    const openDate = await getOpenDate();
    if (!openDate) return Response.json({ error: 'Nav atvērta neviena diena.' }, { status: 409 });

    // Validate all games belong to open date
    const openGames = await getGamesForDate(openDate);
    const openGameIds = new Set(openGames.map(g => g.game_id));
    const openGameMap: Record<string, typeof openGames[0]> = {};
    for (const g of openGames) openGameMap[g.game_id] = g;

    for (const pred of predictions) {
      if (!openGameIds.has(pred.game_id)) {
        return Response.json({ error: 'Spēle nepieder atvērtajai dienai.' }, { status: 422 });
      }
    }

    // Validate all open games are covered
    const submittedIds = new Set(predictions.map(p => p.game_id));
    for (const gid of openGameIds) {
      if (!submittedIds.has(gid)) {
        return Response.json({ error: 'Aizpildi visus laukus.' }, { status: 422 });
      }
    }

    // Validate each prediction value
    for (const pred of predictions) {
      const game = openGameMap[pred.game_id];
      if (game.stage === 'group') {
        if (pred.home_score == null || pred.away_score == null ||
            !Number.isInteger(pred.home_score) || !Number.isInteger(pred.away_score) ||
            pred.home_score < 0 || pred.home_score > 20 ||
            pred.away_score < 0 || pred.away_score > 20) {
          return Response.json({ error: 'Nederīgas vērtības.' }, { status: 422 });
        }
      } else {
        if (!pred.winner_pick ||
            (pred.winner_pick !== game.home_team && pred.winner_pick !== game.away_team)) {
          return Response.json({ error: 'Nederīga uzvarētāja izvēle.' }, { status: 422 });
        }
      }
    }

    // Write all predictions
    const submitted_at = new Date().toISOString();
    await Promise.all(predictions.map(pred =>
      upsertPrediction({
        prediction_id: `P_${member_id}_${pred.game_id}`,
        member_id,
        game_id: pred.game_id,
        home_score: pred.home_score,
        away_score: pred.away_score,
        winner_pick: pred.winner_pick,
        submitted_at,
      })
    ));

    return Response.json({ success: true, submitted_at });
  } catch (err) {
    console.error('[predict]', err);
    return Response.json({ error: 'Servera kļūda. Mēģini vēlreiz.' }, { status: 500 });
  }
}
