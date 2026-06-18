export const dynamic = 'force-dynamic';

import { requireAdmin } from '@/lib/auth';
import { clearOpenDate } from '@/lib/sheets';

export async function POST(request: Request) {
  const err = requireAdmin(request);
  if (err) return err;

  try {
    await clearOpenDate();
    return Response.json({ success: true, open_date: null });
  } catch (err) {
    console.error('[admin/lock]', err);
    return Response.json({ error: 'Servera kļūda. Mēģini vēlreiz.' }, { status: 500 });
  }
}
