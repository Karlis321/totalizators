import { notFound } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import PredictForm from './PredictForm';
import HistorySection from './HistorySection';
import { formatDateLv } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type GameWithPrediction = {
  game_id: string; time_eet: string; home_team: string; away_team: string;
  group: string; round: string; stage: string;
  prediction: { home_score: number | null; away_score: number | null; winner_pick: string | null; submitted_at: string } | null;
};

type MemberData = {
  member: { id: string; display_name: string };
  open_day: { date: string; is_locked: boolean } | null;
  games: GameWithPrediction[];
};

type HistoryData = {
  member: { id: string; display_name: string };
  total_points: number;
  history: {
    date: string;
    games: {
      game_id: string; home_team: string; away_team: string; stage: string;
      prediction: { home_score: number | null; away_score: number | null; winner_pick: string | null } | null;
      result: { actual_home: number | null; actual_away: number | null; winner: string | null };
      points: number | null;
    }[];
  }[];
};

async function getMemberData(slug: string): Promise<MemberData | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/member/${slug}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('member fetch failed');
  return res.json();
}

async function getHistoryData(slug: string): Promise<HistoryData> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/member/${slug}/history`, { cache: 'no-store' });
  if (!res.ok) return { member: { id: slug, display_name: '' }, total_points: 0, history: [] };
  return res.json();
}

export default async function PredictPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [memberData, historyData] = await Promise.all([getMemberData(slug), getHistoryData(slug)]);

  if (!memberData) notFound();

  const { member, open_day, games } = memberData;
  const alreadySubmitted = games.length > 0 && games.every(g => g.prediction !== null);

  return (
    <div className="max-w-lg mx-auto pb-32">
      <AppHeader />

      {/* Member header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-grey-900">Sveiks, {member.display_name}! 👋</h1>
        <p className="text-sm text-grey-600 mt-1">FIFA World Cup 2026 Totalizators</p>
      </div>

      {/* Open day form */}
      {open_day ? (
        <>
          <div className="px-4 mb-3">
            <p className="text-lg font-semibold text-grey-900">{formatDateLv(open_day.date)}</p>
            <p className="text-sm text-grey-600">Ievadi savas prognozes</p>
          </div>
          <PredictForm
            slug={slug}
            games={games}
            alreadySubmitted={alreadySubmitted}
          />
        </>
      ) : (
        <div className="mx-4 mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
          Nav atvērta neviena diena prognozēšanai.
        </div>
      )}

      {/* History */}
      <HistorySection historyData={historyData} />

      <BottomNav />
    </div>
  );
}
