'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import { formatDateShortLv, todayEET } from '@/lib/utils';

type MemberStatus = { member_id: string; display_name: string; submitted: boolean };
type StatusData = {
  open_day: string | null;
  submitted_count: number; total_count: number; all_submitted: boolean;
  members: MemberStatus[];
};
type GameResult = { actual_home: number | null; actual_away: number | null; winner: string | null } | null;
type Game = {
  game_id: string; date: string; time_eet: string; home_team: string; away_team: string;
  group: string; round: string; stage: string; result: GameResult;
};
type ScheduleData = { schedule: { date: string; games: Game[] }[] };

function dateStatus(date: string, openDay: string | null): 'open' | 'past' | 'locked' {
  const today = todayEET();
  if (date === openDay) return 'open';
  if (date < today) return 'past';
  return 'locked';
}

export default function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const [dialog, setDialog] = useState<{ title: string; body?: string; warning?: string; onConfirm: () => void } | null>(null);
  const [resultInputs, setResultInputs] = useState<Record<string, { home: string; away: string; winner: string }>>({});
  const [expandedResults, setExpandedResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  // Always bust cache with a timestamp param
  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/admin/status?t=${Date.now()}`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (res.status === 401) { onLogout(); return; }
    if (res.ok) setStatus(await res.json());
  }, [onLogout, authHeaders]);

  const fetchSchedule = useCallback(async () => {
    const res = await fetch(`/api/schedule?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) setSchedule(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchStatus(), fetchSchedule()]).finally(() => setLoading(false));
    pollRef.current = setInterval(fetchStatus, 15_000); // poll every 15s
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus, fetchSchedule]);

  function dismissToast() { setToast(null); }

  // ── Unlock ──────────────────────────────────────────────────────────────
  async function handleUnlock(date: string) {
    const submittedForDate = status?.open_day === date ? status.submitted_count : 0;
    const isPast = date < todayEET();
    setDialog({
      title: `Atbloķēt spēles ${formatDateShortLv(date)}?`,
      warning: isPast
        ? `⚠️ Šī ir pagājusi diena.${submittedForDate > 0 ? ` Šai dienai jau ir ${submittedForDate} iesniegumi.` : ''}`
        : submittedForDate > 0
        ? `⚠️ Šai dienai jau ir ${submittedForDate} iesniegumi.`
        : undefined,
      onConfirm: async () => {
        setDialog(null);
        // Optimistic update — show immediately
        setStatus(prev => prev ? { ...prev, open_day: date, submitted_count: 0, all_submitted: false, members: prev.members.map(m => ({ ...m, submitted: false })) } : prev);
        const res = await fetch('/api/admin/unlock', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ date }),
        });
        if (res.ok) {
          setToast({ message: `✓ Atbloķēts: ${formatDateShortLv(date)}`, variant: 'success' });
          // Refetch to confirm server state
          setTimeout(fetchStatus, 500);
        } else {
          setToast({ message: 'Kļūda. Mēģini vēlreiz.', variant: 'error' });
          fetchStatus(); // revert optimistic
        }
      },
    });
  }

  // ── Lock ────────────────────────────────────────────────────────────────
  async function handleLock() {
    const count = status?.submitted_count ?? 0;
    setDialog({
      title: `Aizvērt prognozēšanu ${formatDateShortLv(status?.open_day ?? '')}?`,
      warning: count > 0 ? `⚠️ Šai dienai jau ir ${count} iesniegumi.` : undefined,
      onConfirm: async () => {
        setDialog(null);
        // Optimistic update
        setStatus(prev => prev ? { ...prev, open_day: null } : prev);
        const res = await fetch('/api/admin/lock', {
          method: 'POST',
          headers: authHeaders(),
          body: '{}',
        });
        if (res.ok) {
          setToast({ message: '✓ Diena aizvērta.', variant: 'success' });
          setTimeout(fetchStatus, 500);
        } else {
          setToast({ message: 'Kļūda. Mēģini vēlreiz.', variant: 'error' });
          fetchStatus();
        }
      },
    });
  }

  // ── Save result ─────────────────────────────────────────────────────────
  async function handleSaveResult(game: Game) {
    const inp = resultInputs[game.game_id] ?? { home: '', away: '', winner: '' };
    const homeVal = parseInt(inp.home, 10);
    const awayVal = parseInt(inp.away, 10);
    const penaltyWinner = game.stage === 'knockout' && homeVal === awayVal ? inp.winner : null;
    const body = {
      game_id: game.game_id,
      actual_home: homeVal,
      actual_away: awayVal,
      winner: penaltyWinner || null,
    };

    const confirmText = game.stage === 'group'
      ? `Saglabāt: ${game.home_team} ${inp.home} - ${inp.away} ${game.away_team}?`
      : `Saglabāt: ${inp.winner} uzvarēja?`;

    setDialog({
      title: confirmText,
      onConfirm: async () => {
        setDialog(null);
        const res = await fetch('/api/admin/result', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setToast({ message: '✓ Rezultāts saglabāts!', variant: 'success' });
          setResultInputs(prev => { const n = { ...prev }; delete n[game.game_id]; return n; });
          setTimeout(fetchSchedule, 500);
        } else {
          const d = await res.json();
          setToast({ message: d.error ?? 'Kļūda. Mēģini vēlreiz.', variant: 'error' });
        }
      },
    });
  }

  const allDates = schedule
    ? Array.from(new Set(schedule.schedule.map(d => d.date))).sort()
    : [];

  const today = todayEET();
  const pendingGames = schedule
    ? schedule.schedule.flatMap(d => d.games).filter(g => !g.result && g.date <= today)
    : [];
  const completedGames = schedule
    ? schedule.schedule.flatMap(d => d.games).filter(g => g.result)
    : [];

  const showStatusSection = status?.open_day && !status.all_submitted;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-grey-500 text-sm">Ielādē...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <header className="bg-white border-b border-grey-200 px-4 h-14 flex items-center justify-between sticky top-0 z-10">
        <span className="text-base font-semibold text-grey-900">⚽ Totalizators — Admin</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchStatus(); fetchSchedule(); }}
            className="text-xs text-grey-500 border border-grey-200 rounded-lg px-2 py-1"
          >
            ↻ Atjaunot
          </button>
          <button onClick={onLogout} className="text-sm text-grey-600 font-medium">Iziet</button>
        </div>
      </header>

      {/* Open day banner */}
      {status?.open_day ? (
        <div className="mx-4 mt-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Atvērts</p>
            <p className="text-sm font-bold text-green-900">{formatDateShortLv(status.open_day)}</p>
          </div>
          <span className="text-2xl">🟢</span>
        </div>
      ) : (
        <div className="mx-4 mt-4 px-4 py-3 rounded-xl bg-grey-100 border border-grey-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-grey-500 font-medium uppercase tracking-wide">Statuss</p>
            <p className="text-sm font-bold text-grey-700">Nav atvērta neviena diena</p>
          </div>
          <span className="text-2xl">🔴</span>
        </div>
      )}

      {/* ── Section 1: Day control ───────────────────────────────────── */}
      <section className="px-4 pt-6 pb-3">
        <h2 className="text-xl font-bold text-grey-900 mb-3">Dienas Kontrole</h2>
        <div className="space-y-1">
          {allDates.length === 0 && (
            <p className="text-sm text-grey-400 py-4 text-center">Nav spēļu. Pārbaudi, vai spēļu tabula ir aizpildīta.</p>
          )}
          {allDates.map(date => {
            const st = dateStatus(date, status?.open_day ?? null);
            return (
              <div key={date} className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${st === 'open' ? 'bg-green-50 border border-green-200' : 'border-b border-grey-100'}`}>
                <span className={`text-sm font-medium ${st === 'open' ? 'text-green-900' : st === 'past' ? 'text-grey-400' : 'text-grey-900'}`}>
                  {formatDateShortLv(date)}
                </span>
                <div className="flex items-center gap-2">
                  {st === 'open' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Atvērts</span>}
                  {st === 'locked' && <span className="text-xs px-2 py-0.5 rounded-full bg-grey-100 text-grey-500">Slēgts</span>}
                  {st === 'past' && <span className="text-xs px-2 py-0.5 rounded-full bg-grey-50 text-grey-400">Pagājis</span>}
                  {st === 'open' && (
                    <button type="button" onClick={handleLock} className="text-sm font-medium text-red-600 border border-red-300 rounded-lg px-3 py-1.5 active:bg-red-50">
                      Aizvērt
                    </button>
                  )}
                  {(st === 'locked' || st === 'past') && (
                    <button type="button" onClick={() => handleUnlock(date)} className={`text-sm font-medium border rounded-lg px-3 py-1.5 ${
                      st === 'past'
                        ? 'text-grey-500 border-grey-300 active:bg-grey-50'
                        : 'text-brand-green border-brand-green active:bg-green-50'
                    }`}>
                      Atbloķēt
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 2: Submission status ────────────────────────────── */}
      {showStatusSection && (
        <section className="px-4 pt-4 pb-3">
          <h2 className="text-xl font-bold text-grey-900 mb-3">
            Iesniegumi — {formatDateShortLv(status!.open_day!)}
            <span className="ml-2 text-sm font-normal text-grey-500">{status!.submitted_count}/{status!.total_count}</span>
          </h2>
          <div className="space-y-1">
            {status!.members.map(m => (
              <div key={m.member_id} className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${m.submitted ? 'bg-green-50' : 'bg-grey-50'}`}>
                <span className={`text-lg font-bold w-6 text-center ${m.submitted ? 'text-green-600' : 'text-red-400'}`}>
                  {m.submitted ? '✓' : '✕'}
                </span>
                <span className="text-sm font-medium text-grey-900 flex-1">{m.display_name}</span>
                <span className="text-xs text-grey-500">{m.submitted ? 'iesniegts' : 'gaida'}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 3: Result entry ──────────────────────────────────── */}
      <section className="px-4 pt-4 pb-3">
        <h2 className="text-xl font-bold text-grey-900 mb-3">Rezultātu Ievade</h2>

        {pendingGames.length === 0 && completedGames.length > 0 && (
          <p className="text-sm text-green-700 font-medium py-6 text-center">✓ Visi rezultāti ievadīti.</p>
        )}

        {pendingGames.length === 0 && completedGames.length === 0 && (
          <p className="text-sm text-grey-400 py-4 text-center">Nav spēļu.</p>
        )}

        {pendingGames.map(game => {
          const inp = resultInputs[game.game_id] ?? { home: '', away: '', winner: '' };
          const homeVal = parseInt(inp.home, 10);
          const awayVal = parseInt(inp.away, 10);
          const scoresValid = inp.home !== '' && inp.away !== '' && !isNaN(homeVal) && !isNaN(awayVal);
          const isTied = scoresValid && homeVal === awayVal;
          const needsPenaltyWinner = game.stage === 'knockout' && isTied;
          const canSave = scoresValid && (!needsPenaltyWinner || inp.winner !== '');

          return (
            <div key={game.game_id} className="bg-white border border-grey-200 rounded-xl p-4 mb-3 shadow-sm">
              <p className="text-sm font-semibold text-grey-900">{game.home_team} vs {game.away_team}</p>
              <p className="text-xs text-grey-500 mt-0.5">{game.time_eet} EET · {game.round === 'group' ? `Grupa ${game.group}` : game.round}</p>

              {/* Both group and knockout use score inputs */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <input
                  type="number" inputMode="numeric" min={0} max={20}
                  aria-label={`${game.home_team} goli`}
                  value={inp.home}
                  onChange={e => setResultInputs(p => ({ ...p, [game.game_id]: { ...inp, home: e.target.value } }))}
                  className="w-14 h-12 text-2xl font-bold text-center border-2 border-grey-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xl text-grey-400 font-bold">-</span>
                <input
                  type="number" inputMode="numeric" min={0} max={20}
                  aria-label={`${game.away_team} goli`}
                  value={inp.away}
                  onChange={e => setResultInputs(p => ({ ...p, [game.game_id]: { ...inp, away: e.target.value } }))}
                  className="w-14 h-12 text-2xl font-bold text-center border-2 border-grey-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {/* Penalty winner selector — only shown for knockout when scores are tied */}
              {needsPenaltyWinner && (
                <div className="mt-3">
                  <p className="text-xs text-grey-500 mb-2 text-center">Soda sitienu uzvarētājs</p>
                  <div className="flex gap-2">
                    {[game.home_team, game.away_team].map(team => (
                      <button
                        type="button"
                        key={team}
                        onClick={() => setResultInputs(p => ({ ...p, [game.game_id]: { ...inp, winner: team } }))}
                        className={`flex-1 h-10 rounded-lg border-2 text-sm font-semibold transition-colors ${
                          inp.winner === team
                            ? 'border-brand-green bg-brand-green-light text-brand-green'
                            : 'border-grey-300 bg-white text-grey-900'
                        }`}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleSaveResult(game)}
                disabled={!canSave}
                className="w-full h-11 mt-4 bg-brand-green text-white rounded-lg font-semibold text-sm disabled:bg-grey-200 disabled:text-grey-400"
              >
                Saglabāt rezultātu
              </button>
            </div>
          );
        })}

        {completedGames.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setExpandedResults(p => !p)}
              className="text-sm font-semibold text-grey-600 flex items-center gap-1"
            >
              {expandedResults ? '▲' : '▼'} Ievadīti rezultāti ({completedGames.length})
            </button>
            {expandedResults && (
              <div className="mt-2 space-y-1">
                {completedGames.map(game => (
                  <div key={game.game_id} className="py-2 px-3 flex items-center justify-between rounded-lg bg-grey-50">
                    <span className="text-sm text-grey-900">
                      {game.home_team} vs {game.away_team}
                      {' — '}
                      {game.stage === 'group'
                        ? `${game.result?.actual_home} - ${game.result?.actual_away}`
                        : `${game.result?.winner} ✓`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setResultInputs(p => ({
                        ...p,
                        [game.game_id]: {
                          home: game.result?.actual_home != null ? String(game.result.actual_home) : '',
                          away: game.result?.actual_away != null ? String(game.result.actual_away) : '',
                          winner: game.result?.winner ?? '',
                        },
                      }))}
                      className="text-xs text-brand-green font-medium ml-2"
                    >
                      Labot
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          body={dialog.body}
          warning={dialog.warning}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={dismissToast} />}
    </div>
  );
}
