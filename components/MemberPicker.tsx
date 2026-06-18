'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Member = { member_id: string; display_name: string };

export default function MemberPicker({ members }: { members: Member[] }) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('member_slug');
    if (!saved) setShow(true);
  }, []);

  function handlePick(slug: string, displayName: string) {
    localStorage.setItem('member_slug', slug);
    localStorage.setItem('member_display_name', displayName);
    setShow(false);
    router.push(`/predict/${slug}`);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <p className="text-3xl text-center mb-2">⚽</p>
        <h2 className="text-xl font-bold text-grey-900 text-center mb-1">Sveicināti!</h2>
        <p className="text-sm text-grey-600 text-center mb-6">Kurš tu esi?</p>
        <div className="grid grid-cols-2 gap-3">
          {members.map(m => (
            <button
              key={m.member_id}
              onClick={() => handlePick(m.member_id, m.display_name)}
              className="h-14 rounded-xl border-2 border-grey-200 text-sm font-semibold text-grey-900 hover:border-brand-green hover:bg-brand-green-light transition-colors active:scale-95"
            >
              {m.display_name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
