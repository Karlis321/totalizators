import { getMembers } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const members = await getMembers();
    return Response.json({ members });
  } catch (err) {
    console.error('[members]', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
