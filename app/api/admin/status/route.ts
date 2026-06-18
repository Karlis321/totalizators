import { requireAdmin } from '@/lib/auth';
import { getOpenDate, getSubmissionStatus } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const err = requireAdmin(request);
  if (err) return err;

  try {
    const openDate = await getOpenDate();
    if (!openDate) {
      return Response.json({ open_day: null, submitted_count: 0, total_count: 8, all_submitted: false, members: [] });
    }

    const members = await getSubmissionStatus(openDate);
    const submitted_count = members.filter(m => m.submitted).length;
    const all_submitted = submitted_count === members.length;

    return Response.json({
      open_day: openDate,
      submitted_count,
      total_count: members.length,
      all_submitted,
      members,
    });
  } catch (err) {
    console.error('[admin/status]', err);
    return Response.json({ error: 'Servera kļūda. Mēģini vēlreiz.' }, { status: 500 });
  }
}
