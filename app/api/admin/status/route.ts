import { requireAdmin } from '@/lib/auth';
import { getOpenDates, getSubmissionStatus } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const err = requireAdmin(request);
  if (err) return err;

  try {
    const openDates = await getOpenDates();
    if (openDates.length === 0) {
      return Response.json({ open_days: [], submitted_count: 0, total_count: 8, all_submitted: false, members: [] });
    }

    const members = await getSubmissionStatus(openDates);
    const submitted_count = members.filter(m => m.submitted).length;
    const all_submitted = submitted_count === members.length;

    return Response.json({ open_days: openDates, submitted_count, total_count: members.length, all_submitted, members });
  } catch (err) {
    console.error('[admin/status]', err);
    return Response.json({ error: 'Servera kļūda. Mēģini vēlreiz.' }, { status: 500 });
  }
}
