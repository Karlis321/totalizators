'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Member = { id: string; display_name: string };

export default function MemberPicker() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('member_slug');
    if (saved) return; // already picked, don't show

    setShow(true);
    fetch('/api/members')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(`Kļūda: ${data.error}`);
        } else {
          setMembers(data.members ?? []);
        }
      })
      .catch(() => setError('Nevar savienoties ar serveri.'))
      .finally(() => setLoading(false));
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

        {loading && (
          <p className="text-sm text-grey-500 text-center py-4">Ielādē...</p>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center py-4">{error}</p>
        )}

        {!loading && !error && members.length === 0 && (
          <p className="text-sm text-grey-500 text-center py-4">Nav dalībnieku. Pārbaudi Google Sheets.</p>
        )}

        {!loading && members.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => handlePick(m.id, m.display_name)}
                className="h-14 rounded-xl border-2 border-grey-200 text-sm font-semibold text-grey-900 hover:border-brand-green hover:bg-brand-green-light transition-colors active:scale-95"
              >
                {m.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
