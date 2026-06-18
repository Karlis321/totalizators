import { requireAdmin } from '@/lib/auth';
import { getGames, setOpenDate } from '@/lib/sheets';

export async function POST(request: Request) {
  const err = requireAdmin(request);
  if (err) return err;

  try {
    const { date } = await request.json() as { date: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: 'Nederīgs datuma formāts.' }, { status: 400 });
    }

    const games = await getGames();
    const hasGames = games.some(g => g.date === date);
    if (!hasGames) {
      return Response.json({ error: 'Nav spēļu šajā datumā.' }, { status: 400 });
    }

    await setOpenDate(date);
    return Response.json({ success: true, open_date: date });
  } catch (err) {
    console.error('[admin/unlock]', err);
    return Response.json({ error: 'Servera kļūda. Mēģini vēlreiz.' }, { status: 500 });
  }
}
