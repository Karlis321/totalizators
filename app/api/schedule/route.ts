import { getGames, getResults } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [games, results] = await Promise.all([getGames(), getResults()]);
    const resultMap: Record<string, typeof results[0]> = {};
    for (const r of results) resultMap[r.game_id] = r;

    // Sort by date then time
    const sorted = [...games].sort((a, b) =>
      a.date !== b.date ? a.date.localeCompare(b.date) : a.time_eet.localeCompare(b.time_eet)
    );

    // Group by date
    const dateMap: Record<string, typeof sorted> = {};
    for (const g of sorted) {
      if (!dateMap[g.date]) dateMap[g.date] = [];
      dateMap[g.date].push(g);
    }

    const schedule = Object.entries(dateMap).map(([date, gms]) => ({
      date,
      games: gms.map(g => ({ ...g, result: resultMap[g.game_id] ?? null })),
    }));

    return Response.json({ schedule });
  } catch (err) {
    console.error('[schedule]', err);
    return Response.json({ error: 'Servera kļūda. Mēģini vēlreiz.' }, { status: 500 });
  }
}
