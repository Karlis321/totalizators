import { google } from 'googleapis';
import { unstable_cache } from 'next/cache';

// ─── Auth ────────────────────────────────────────────────────────────────────

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  const credentials = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

// ─── Core read/write ─────────────────────────────────────────────────────────

async function readSheet(range: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range });
  return (res.data.values ?? []).slice(1); // skip header row
}

async function updateRange(range: string, values: string[][]): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

async function appendRow(range: string, values: string[]): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

// Generic upsert keyed on a single column
async function upsertRow(
  sheetName: string,
  keyColumnIndex: number,
  keyValue: string,
  rowData: string[]
): Promise<void> {
  const colLetter = String.fromCharCode(65 + rowData.length - 1);
  const range = `${sheetName}!A:${colLetter}`;
  const rows = await readSheet(range);
  const rowIndex = rows.findIndex(row => row[keyColumnIndex] === keyValue);
  if (rowIndex !== -1) {
    const targetRange = `${sheetName}!A${rowIndex + 2}:${colLetter}${rowIndex + 2}`;
    await updateRange(targetRange, [rowData]);
  } else {
    await appendRow(`${sheetName}!A:A`, rowData);
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type Member = { id: string; display_name: string; active: boolean };

export type Game = {
  game_id: string; date: string; time_eet: string;
  home_team: string; away_team: string;
  group: string; round: string; stage: 'group' | 'knockout';
};

export type Prediction = {
  prediction_id: string; member_id: string; game_id: string;
  home_score: number | null; away_score: number | null;
  winner_pick: string | null; submitted_at: string;
};

export type Result = {
  game_id: string; actual_home: number | null; actual_away: number | null;
  winner: string | null; entered_at: string;
};

export type PointsRow = { member_id: string; game_id: string; points: number };

export type ScoringConfig = {
  pts_exact: number;             // group: exact scoreline
  pts_correct_winner: number;    // group: correct outcome (win/draw)
  pts_one_team: number;          // group: one team's score right
  pts_knockout_exact: number;    // knockout: exact scoreline
  pts_knockout_winner: number;   // knockout: correct winner
  pts_knockout_one_team: number; // knockout: one team's score right
};

// ─── Members ─────────────────────────────────────────────────────────────────

export const getMembers = unstable_cache(
  async (): Promise<Member[]> => {
    console.log('[sheets] getMembers');
    const rows = await readSheet('Members!A:C');
    return rows
      .filter(r => r[0])
      .map(r => ({ id: r[0], display_name: r[1], active: r[2] === 'TRUE' }))
      .filter(m => m.active);
  },
  ['members'],
  { revalidate: 300 }
);

export const getMember = unstable_cache(
  async (slug: string): Promise<Member | null> => {
    const members = await getMembers();
    return members.find(m => m.id === slug) ?? null;
  },
  ['member'],
  { revalidate: 300 }
);

// ─── Games ───────────────────────────────────────────────────────────────────

export const getGames = unstable_cache(
  async (): Promise<Game[]> => {
    console.log('[sheets] getGames');
    const rows = await readSheet('Games!A:H');
    return rows.filter(r => r[0]).map(r => ({
      game_id: r[0], date: r[1], time_eet: r[2],
      home_team: r[3], away_team: r[4],
      group: r[5] ?? '', round: r[6],
      stage: (r[7] === 'knockout' ? 'knockout' : 'group') as 'group' | 'knockout',
    }));
  },
  ['games'],
  { revalidate: 300 }
);

export const getGamesForDate = unstable_cache(
  async (date: string): Promise<Game[]> => {
    const games = await getGames();
    return games.filter(g => g.date === date);
  },
  ['games-for-date'],
  { revalidate: 300 }
);

// ─── Config ──────────────────────────────────────────────────────────────────

async function readConfig(): Promise<Record<string, string>> {
  const rows = await readSheet('Config!A:B');
  const map: Record<string, string> = {};
  for (const r of rows) if (r[0]) map[r[0]] = r[1] ?? '';
  return map;
}

export const getOpenDate = unstable_cache(
  async (): Promise<string | null> => {
    console.log('[sheets] getOpenDate');
    const config = await readConfig();
    return config['open_date'] || null;
  },
  ['open_date'],
  { revalidate: 10 }
);

export const getScoringConfig = unstable_cache(
  async (): Promise<ScoringConfig> => {
    const config = await readConfig();
    return {
      pts_exact:             parseInt(config['pts_exact']             ?? '4', 10),
      pts_correct_winner:    parseInt(config['pts_correct_winner']    ?? '1', 10),
      pts_one_team:          parseInt(config['pts_one_team']          ?? '1', 10),
      pts_knockout_exact:    parseInt(config['pts_knockout_exact']    ?? '3', 10),
      pts_knockout_winner:   parseInt(config['pts_knockout_winner']   ?? '1', 10),
      pts_knockout_one_team: parseInt(config['pts_knockout_one_team'] ?? '1', 10),
    };
  },
  ['scoring_config'],
  { revalidate: 300 }
);

export async function setOpenDate(date: string): Promise<void> {
  const rows = await readSheet('Config!A:B');
  const rowIndex = rows.findIndex(r => r[0] === 'open_date');
  if (rowIndex !== -1) {
    await updateRange(`Config!B${rowIndex + 2}`, [[date]]);
  }
}

export async function clearOpenDate(): Promise<void> {
  await setOpenDate('');
}

// ─── Predictions ─────────────────────────────────────────────────────────────

function parsePredict(r: string[]): Prediction {
  return {
    prediction_id: r[0], member_id: r[1], game_id: r[2],
    home_score: r[3] !== '' && r[3] != null ? parseInt(r[3], 10) : null,
    away_score: r[4] !== '' && r[4] != null ? parseInt(r[4], 10) : null,
    winner_pick: r[5] || null,
    submitted_at: r[6] ?? '',
  };
}

export async function getPredictions(memberId: string, gameIds: string[]): Promise<Prediction[]> {
  const rows = await readSheet('Predictions!A:G');
  return rows
    .filter(r => r[1] === memberId && gameIds.includes(r[2]))
    .map(parsePredict);
}

export async function getAllPredictionsForDate(gameIds: string[]): Promise<Prediction[]> {
  const rows = await readSheet('Predictions!A:G');
  return rows.filter(r => gameIds.includes(r[2])).map(parsePredict);
}

export async function getAllPredictionsForMember(memberId: string): Promise<Prediction[]> {
  const rows = await readSheet('Predictions!A:G');
  return rows.filter(r => r[1] === memberId).map(parsePredict);
}

export async function upsertPrediction(p: Prediction): Promise<void> {
  const rowData = [
    p.prediction_id, p.member_id, p.game_id,
    p.home_score != null ? String(p.home_score) : '',
    p.away_score != null ? String(p.away_score) : '',
    p.winner_pick ?? '',
    p.submitted_at,
  ];
  await upsertRow('Predictions', 0, p.prediction_id, rowData);
}

export async function getSubmissionStatus(
  openDate: string
): Promise<{ member_id: string; display_name: string; submitted: boolean }[]> {
  const [members, games] = await Promise.all([getMembers(), getGamesForDate(openDate)]);
  const gameIds = games.map(g => g.game_id);
  const predictions = await getAllPredictionsForDate(gameIds);

  return members.map(m => {
    const memberPreds = predictions.filter(p => p.member_id === m.id);
    const submitted = gameIds.length > 0 && gameIds.every(gid =>
      memberPreds.some(p => p.game_id === gid)
    );
    return { member_id: m.id, display_name: m.display_name, submitted };
  });
}

// ─── Results ─────────────────────────────────────────────────────────────────

function parseResult(r: string[]): Result {
  return {
    game_id: r[0],
    actual_home: r[1] !== '' && r[1] != null ? parseInt(r[1], 10) : null,
    actual_away: r[2] !== '' && r[2] != null ? parseInt(r[2], 10) : null,
    winner: r[3] || null,
    entered_at: r[4] ?? '',
  };
}

export async function getResults(): Promise<Result[]> {
  const rows = await readSheet('Results!A:E');
  return rows.filter(r => r[0]).map(parseResult);
}

export async function upsertResult(result: Result): Promise<void> {
  const rowData = [
    result.game_id,
    result.actual_home != null ? String(result.actual_home) : '',
    result.actual_away != null ? String(result.actual_away) : '',
    result.winner ?? '',
    result.entered_at,
  ];
  await upsertRow('Results', 0, result.game_id, rowData);
}

// ─── Points ──────────────────────────────────────────────────────────────────

export async function getAllPoints(): Promise<PointsRow[]> {
  const rows = await readSheet('Points!A:C');
  return rows.filter(r => r[0]).map(r => ({
    member_id: r[0], game_id: r[1], points: parseInt(r[2] ?? '0', 10),
  }));
}

export async function getPointsForMember(memberId: string): Promise<PointsRow[]> {
  const all = await getAllPoints();
  return all.filter(p => p.member_id === memberId);
}

export async function upsertPoints(memberId: string, gameId: string, points: number): Promise<void> {
  const rows = await readSheet('Points!A:C');
  const rowIndex = rows.findIndex(r => r[0] === memberId && r[1] === gameId);
  const rowData = [memberId, gameId, String(points)];
  if (rowIndex !== -1) {
    await updateRange(`Points!A${rowIndex + 2}:C${rowIndex + 2}`, [rowData]);
  } else {
    await appendRow('Points!A:A', rowData);
  }
}
