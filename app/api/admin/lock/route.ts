export const dynamic = 'force-dynamic';

import { requireAdmin } from '@/lib/auth';
import { removeOpenDate, clearOpenDate } from '@/lib/sheets';

export async function POST(request: Request) {
  const err = requireAdmin(request);
  if (err) return err;

  try {
    const body = await request.json().catch(() => ({})) as { date?: string };
    if (body.date) {
      await removeOpenDate(body.date);
    } else {
      await clearOpenDate();
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error('[admin/lock]', err);
    return Response.json({ error: 'Servera kļūda. Mēģini vēlreiz.' }, { status: 500 });
  }
}
