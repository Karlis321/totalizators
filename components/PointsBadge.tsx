import { pointsLabel } from '@/lib/utils';

const styles: Record<number, string> = {
  3: 'bg-green-100 text-green-800 font-bold',
  2: 'bg-blue-100 text-blue-800 font-bold',
  1: 'bg-yellow-100 text-yellow-800 font-bold',
  0: 'bg-grey-100 text-grey-600',
};

export default function PointsBadge({ points }: { points: number | null }) {
  if (points === null) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-grey-100 text-grey-400">—</span>;
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[points] ?? 'bg-grey-100 text-grey-600'}`}>
      {pointsLabel(points)}
    </span>
  );
}
