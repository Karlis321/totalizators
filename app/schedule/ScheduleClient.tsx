'use client';
import { useState } from 'react';
import { DateSection } from './page';
import type { DateGroup } from './page';

export default function ScheduleClient({
  completed,
  totalCompleted,
}: {
  completed: DateGroup[];
  totalCompleted: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 border-t border-grey-200 text-sm text-grey-600"
      >
        <span className="font-semibold">
          {open ? '▲' : '▼'} Spēlētas spēles ({totalCompleted})
        </span>
        <span className="text-xs text-grey-400">{open ? 'Slēpt' : 'Rādīt'}</span>
      </button>

      {open && completed.map(dg => <DateSection key={dg.date} {...dg} />)}
    </div>
  );
}
