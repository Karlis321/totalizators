export const dynamic = 'force-dynamic';

import {
  getGames, getResults, getMembers, getPredictions,
  upsertResult, upsertPoints, getScoringConfig,
} from '@/lib/sheets';
import { calculatePoints } from '@/lib/scoring';

// ── Team name normalisation ───────────────────────────────────────────────────
// football-data.org uses full official names; our Sheets may use short aliases.
// We normalise both sides and try several matching strategies.

const ALIASES: Record<string, string[]> = {
  'usa':                     ['united states', 'united states of america', 'u.s.a.', 'us'],
  'south korea':             ['korea republic', 'republic of korea'],
  'iran':                    ['ir iran'],
  'ivory coast':             ['côte d\'ivoire', 'cote d\'ivoire', 'cote divoire'],
  'turkey':                  ['türkiye', 'turkiye'],
  'dr congo':                ['democratic republic of the congo', 'congo dr', 'drc'],
  'north macedonia':         ['republic of north macedonia', 'macedonia'],
  'bosnia':                  ['bosnia and herzegovina', 'bosnia & herzegovina'],
  'trinidad':                ['trinidad and tobago', 'trinidad & tobago'],
  'new zealand':             ['all whites'],
};

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// Return the canonical alias key if this API name maps to one of our short names
function resolveAlias(apiName: string): string {
  const norm = normalise(apiName);
  for (const [canonical, variants] of Object.entries(ALIASES)) {
    if (variants.some(v => normalise(v) === norm)) return canonical;
  }
  return norm;
}

function teamsMatch(apiName: string, sheetName: string): boolean {
  const apiNorm  = normalise(apiName);
  const sheetNorm = normalise(sheetName);
  if (apiNorm === sheetNorm) return true;

  const apiAlias   = resolveAlias(apiName);
  const sheetAlias = resolveAlias(sheetName);
  if (apiAlias === sheetAlias) return true;

  // Substring: e.g. "France" matches "France U21" or vice-versa — unlikely but safe
  if (apiNorm.includes(sheetNorm) || sheetNorm.includes(apiNorm)) return true;

  return false;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Accept either the Vercel cron secret OR the admin token (for manual trigger from the UI).
  const authHeader = request.headers.get('authorization');
  const validTokens = [
    process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null,
    process.env.ADMIN_TOKEN  ? `Bearer ${process.env.ADMIN_TOKEN}`  : null,
  ].filter(Boolean);
  if (!authHeader || !validTokens.includes(authHeader)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'FOOTBALL_DATA_API_KEY not configured' }, { status: 500 });
  }

  // Allow a manual date override via query param
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  // Default: yesterday in UTC (ensures all games, including late ones, are finished)
  const targetDate = dateParam ?? (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  try {
    // ── 1. Fetch finished matches from football-data.org ──────────────────
    const apiRes = await fetch(
      `https://api.football-data.org/v4/competitions/2000/matches?dateFrom=${targetDate}&dateTo=${targetDate}&status=FINISHED`,
      {
        headers: { 'X-Auth-Token': apiKey },
        // No Next.js cache — always fresh
        cache: 'no-store',
      }
    );

    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error('[cron/fetch-results] football-data.org error:', apiRes.status, text);
      return Response.json({ error: 'Football API error', status: apiRes.status, body: text }, { status: 502 });
    }

    const { matches: apiMatches = [] } = await apiRes.json() as {
      matches: {
        homeTeam: { name: string };
        awayTeam: { name: string };
        score: {
          fullTime: { home: number | null; away: number | null };
          penalties?: { home: number | null; away: number | null };
        };
      }[];
    };

    // ── 2. Get our scheduled games for this date ──────────────────────────
    const allGames = await getGames();
    const dayGames = allGames.filter(g => g.date === targetDate);

    if (dayGames.length === 0) {
      return Response.json({ message: `No games in Sheets for ${targetDate}`, saved: 0 });
    }

    // ── 3. Get already-entered results (skip those games) ─────────────────
    const existingResults = await getResults();
    const alreadyEntered = new Set(existingResults.map(r => r.game_id));

    // ── 4. Match API results to our games and save ────────────────────────
    const [members, config] = await Promise.all([getMembers(), getScoringConfig()]);

    const saved:     string[] = [];
    const skipped:   string[] = [];
    const unmatched: string[] = [];

    for (const match of apiMatches) {
      const score = match.score?.fullTime;
      if (score?.home == null || score?.away == null) continue;

      const apiHome = match.homeTeam?.name ?? '';
      const apiAway = match.awayTeam?.name ?? '';

      // Find the matching game in our Sheets
      const sheetGame = dayGames.find(g =>
        teamsMatch(apiHome, g.home_team) && teamsMatch(apiAway, g.away_team)
      );

      if (!sheetGame) {
        unmatched.push(`${apiHome} vs ${apiAway}`);
        continue;
      }

      // Skip if admin already entered this result manually
      if (alreadyEntered.has(sheetGame.game_id)) {
        skipped.push(sheetGame.game_id);
        continue;
      }

      const actual_home = score.home;
      const actual_away = score.away;

      // Determine penalty winner for knockout draws
      let winner: string | null = null;
      if (sheetGame.stage === 'knockout' && actual_home === actual_away) {
        const pen = match.score?.penalties;
        if (pen?.home != null && pen?.away != null) {
          winner = pen.home > pen.away ? sheetGame.home_team : sheetGame.away_team;
        }
      }

      // Save result to Sheets
      const entered_at = new Date().toISOString();
      await upsertResult({ game_id: sheetGame.game_id, actual_home, actual_away, winner, entered_at });

      // Calculate + store points for every member
      const allPreds = await Promise.all(
        members.map(m => getPredictions(m.id, [sheetGame.game_id]))
      );

      for (let i = 0; i < members.length; i++) {
        const m   = members[i];
        const pred = allPreds[i][0] ?? null;
        const prediction = pred?.home_score != null && pred?.away_score != null
          ? { home_score: pred.home_score, away_score: pred.away_score }
          : null;

        const pts = calculatePoints(
          sheetGame.stage,
          prediction,
          { actual_home, actual_away, winner },
          { home_team: sheetGame.home_team, away_team: sheetGame.away_team },
          config
        );
        await upsertPoints(m.id, sheetGame.game_id, pts);
      }

      saved.push(sheetGame.game_id);
    }

    return Response.json({
      date: targetDate,
      api_matches: apiMatches.length,
      saved: saved.length,
      saved_games: saved,
      skipped_already_entered: skipped,
      unmatched_api_games: unmatched,
    });

  } catch (err) {
    console.error('[cron/fetch-results]', err);
    return Response.json({ error: 'Server error', detail: String(err) }, { status: 500 });
  }
}
