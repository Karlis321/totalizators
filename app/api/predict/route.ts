import { getMember, getOpenDates, getGamesForDates, upsertPrediction } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, predictions } = body as {
      member_id: string;
      predictions: { game_id: string; home_score: number | null; away_score: number | null; winner_pick: string | null }[];
    };

    if (!member_id || !Array.isArray(predictions) || predictions.length === 0) {
      return Response.json({ error: 'Nederīgs pieprasījums.' }, { status: 400 });
    }

    // Validate member
    const member = await getMember(member_id);
    if (!member) return Response.json({ error: 'Dalībnieks nav atrasts.' }, { status: 404 });

    // Validate day is open
    const openDates = await getOpenDates();
    if (openDates.length === 0) return Response.json({ error: 'Nav atvērta neviena diena.' }, { status: 409 });

    // Get the authoritative game list from Sheets (source of truth)
    const openGames = await getGamesForDates(openDates);
    if (openGames.length === 0) {
      return Response.json({ error: 'Šajā dienā nav spēļu.' }, { status: 409 });
    }

    const openGameIds = new Set(openGames.map(g => g.game_id));
    const openGameMap: Record<string, typeof openGames[0]> = {};
    for (const g of openGames) openGameMap[g.game_id] = g;

    // Only keep predictions for games that still exist in Sheets
    // (handles the case where a game was deleted after the user loaded the page)
    const validPredictions = predictions.filter(p => openGameIds.has(p.game_id));

    // All currently-existing open games must be covered
    const submittedIds = new Set(validPredictions.map(p => p.game_id));
    const missing = openGames.filter(g => !submittedIds.has(g.game_id));
    if (missing.length > 0) {
      return Response.json({ error: 'Aizpildi visus laukus.' }, { status: 422 });
    }

    // Validate each prediction value
    for (const pred of validPredictions) {
      // Both group and knockout now require home_score + away_score
      if (
        pred.home_score == null || pred.away_score == null ||
        !Number.isInteger(pred.home_score) || !Number.isInteger(pred.away_score) ||
        pred.home_score < 0 || pred.home_score > 20 ||
        pred.away_score < 0 || pred.away_score > 20
      ) {
        return Response.json({ error: 'Nederīgas vērtības.' }, { status: 422 });
      }
    }

    // Write all predictions to Sheets
    const submitted_at = new Date().toISOString();
    await Promise.all(validPredictions.map(pred =>
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
