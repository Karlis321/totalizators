'use client';
import { useEffect, useState, useCallback } from 'react';
import RoundBadge from '@/components/RoundBadge';
import Banner from '@/components/Banner';
import Toast from '@/components/Toast';

type GameWithPrediction = {
  game_id: string; time_eet: string; home_team: string; away_team: string;
  group: string; round: string; stage: string;
  prediction: { home_score: number | null; away_score: number | null; winner_pick: string | null; submitted_at: string } | null;
};

type InputState = { home: string; away: string; winner: string };

function isValidScore(v: string) {
  const n = parseInt(v, 10);
  return !isNaN(n) && n >= 0 && n <= 20 && String(n) === v.trim();
}

export default function PredictForm({
  slug,
  games: initialGames,
  alreadySubmitted: initialSubmitted,
}: {
  slug: string;
  games: GameWithPrediction[];
  alreadySubmitted: boolean;
}) {
  // Write slug to localStorage so BottomNav can link to this page
  useEffect(() => {
    localStorage.setItem('member_slug', slug);
  }, [slug]);

  const [games, setGames] = useState(initialGames);
  const [inputs, setInputs] = useState<Record<string, InputState>>(() => {
    const init: Record<string, InputState> = {};
    for (const g of initialGames) {
      init[g.game_id] = {
        home: g.prediction?.home_score != null ? String(g.prediction.home_score) : '',
        away: g.prediction?.away_score != null ? String(g.prediction.away_score) : '',
        winner: g.prediction?.winner_pick ?? '',
      };
    }
    return init;
  });

  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  // Re-fetch games from server to stay in sync if admin removes a game
  useEffect(() => {
    fetch(`/api/predict-games?slug=${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.games) return;
        setGames(data.games);
        setInputs(prev => {
          const next: Record<string, InputState> = {};
          for (const g of data.games as GameWithPrediction[]) {
            next[g.game_id] = prev[g.game_id] ?? {
              home: g.prediction?.home_score != null ? String(g.prediction.home_score) : '',
              away: g.prediction?.away_score != null ? String(g.prediction.away_score) : '',
              winner: g.prediction?.winner_pick ?? '',
            };
          }
          return next;
        });
        const allSubmitted = data.games.length > 0 && (data.games as GameWithPrediction[]).every(g => g.prediction !== null);
        setSubmitted(allSubmitted);
      })
      .catch(() => {/* silently keep server-rendered data */});
  }, [slug]);

  const allFilled = games.every(g => {
    const inp = inputs[g.game_id];
    if (!inp) return false;
    if (g.stage === 'group') return isValidScore(inp.home) && isValidScore(inp.away);
    return inp.winner !== '';
  });

  async function handleSubmit() {
    if (!allFilled || loading) return;
    setLoading(true);
    try {
      const predictions = games.map(g => {
        const inp = inputs[g.game_id];
        return {
          game_id: g.game_id,
          home_score: g.stage === 'group' ? parseInt(inp.home, 10) : null,
          away_score: g.stage === 'group' ? parseInt(inp.away, 10) : null,
          winner_pick: g.stage === 'knockout' ? inp.winner : null,
        };
      });
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: slug, predictions }),
      });
      if (res.ok) {
        setSubmitted(true);
        setFlash(true);
        setTimeout(() => setFlash(false), 1500);
        setToast({ message: 'Prognoze saglabāta ✓', variant: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.error ?? 'Kļūda saglabājot. Mēģini vēlreiz.', variant: 'error' });
      }
    } catch {
      setToast({ message: 'Kļūda saglabājot. Mēģini vēlreiz.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function setInput(gameId: string, field: keyof InputState, value: string) {
    setInputs(prev => ({ ...prev, [gameId]: { ...prev[gameId], [field]: value } }));
    if (submitted) setSubmitted(false); // mark as unsaved when editing
  }

  if (games.length === 0) {
    return (
      <div className="mx-4 mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
        Nav spēļu šajā dienā.
      </div>
    );
  }

  return (
    <>
      {submitted && !flash && (
        <div className="mx-4 mb-4">
          <Banner variant="success" message="Prognoze jau iesniegta — tu vari labot līdz termiņam." />
        </div>
      )}

      <div className="px-4 space-y-3">
        {games.map(game => (
          <div key={game.game_id} className="bg-white rounded-xl border border-grey-200 p-4 shadow-sm">
            {/* Both group and knockout use score inputs */}
            <div className="flex items-center justify-center gap-3">
              <span className="text-base font-semibold text-grey-900 flex-1 text-right">{game.home_team}</span>
              <input
                type="number" inputMode="numeric" pattern="[0-9]*"
                min={0} max={20}
                value={inputs[game.game_id]?.home ?? ''}
                onChange={e => setInput(game.game_id, 'home', e.target.value)}
                placeholder="–"
                aria-label={`${game.home_team} goli`}
                className="w-14 h-12 text-2xl font-bold text-center text-grey-900 border-2 border-grey-300 rounded-lg bg-white focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-grey-400 mx-1">-</span>
              <input
                type="number" inputMode="numeric" pattern="[0-9]*"
                min={0} max={20}
                value={inputs[game.game_id]?.away ?? ''}
                onChange={e => setInput(game.game_id, 'away', e.target.value)}
                placeholder="–"
                aria-label={`${game.away_team} goli`}
                className="w-14 h-12 text-2xl font-bold text-center text-grey-900 border-2 border-grey-300 rounded-lg bg-white focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-base font-semibold text-grey-900 flex-1 text-left">{game.away_team}</span>
            </div>
            {game.stage === 'knockout' && (
              <p className="text-xs text-grey-400 text-center mt-1">Rezultāts pēc papildlaika (bez soda sitieniem)</p>
            )}
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-grey-500">{game.time_eet} EET</span>
              <RoundBadge round={game.round} group={game.group} />
            </div>
          </div>
        ))}
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-[54px] left-0 right-0 bg-white border-t border-grey-200 px-4 py-3 z-20 max-w-lg mx-auto">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allFilled || loading}
          className={`w-full h-12 rounded-lg text-base font-semibold transition-colors ${
            flash
              ? 'bg-brand-green-light text-brand-green'
              : allFilled && !loading
              ? 'bg-brand-green text-white'
              : 'bg-grey-200 text-grey-400 cursor-not-allowed'
          }`}
        >
          {flash ? 'Saglabāts! ✓' : loading ? '...' : submitted ? 'Saglabāt izmaiņas' : 'Iesniegt'}
        </button>
      </div>

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={dismissToast} />}
    </>
  );
}
