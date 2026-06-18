import { roundLabel } from '@/lib/utils';

const colours: Record<string, string> = {
  group:  'bg-blue-100 text-blue-800',
  R32:    'bg-purple-100 text-purple-800',
  R16:    'bg-purple-100 text-purple-800',
  QF:     'bg-orange-100 text-orange-800',
  SF:     'bg-red-100 text-red-800',
  bronze: 'bg-yellow-100 text-yellow-800',
  final:  'bg-green-100 text-green-800',
};

export default function RoundBadge({ round, group }: { round: string; group: string }) {
  const colour = colours[round] ?? 'bg-grey-100 text-grey-600';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${colour}`}>
      {roundLabel(round, group)}
    </span>
  );
}
