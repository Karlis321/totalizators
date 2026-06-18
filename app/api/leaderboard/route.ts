import { getMembers, getAllPoints, getResults } from '@/lib/sheets';

export const revalidate = 30;

export async function GET() {
  try {
    const [members, allPoints, results] = await Promise.all([
      getMembers(), getAllPoints(), getResults(),
    ]);

    // Sum points per member
    const totals: Record<string, number> = {};
    for (const m of members) totals[m.id] = 0;
    for (const p of allPoints) {
      if (totals[p.member_id] !== undefined) totals[p.member_id] += p.points;
    }

    // Sort descending
    const sorted = members
      .map(m => ({ member_id: m.id, display_name: m.display_name, total_points: totals[m.id] }))
      .sort((a, b) => b.total_points - a.total_points);

    // Assign ranks (shared rank for ties)
    let rank = 1;
    const entries = sorted.map((e, i) => {
      if (i > 0 && e.total_points < sorted[i - 1].total_points) rank = i + 1;
      return { rank, ...e };
    });

    // last_updated = most recent entered_at, or now if no results
    const timestamps = results.map(r => r.entered_at).filter(Boolean).sort();
    const last_updated = timestamps.length > 0
      ? timestamps[timestamps.length - 1]
      : new Date().toISOString();

    return Response.json({ last_updated, entries });
  } catch (err) {
    console.error('[leaderboard]', err);
    return Response.json({ error: 'Servera kļūda. Mēģini vēlreiz.' }, { status: 500 });
  }
}
