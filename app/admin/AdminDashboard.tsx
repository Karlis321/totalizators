'use client';
import { useEffect, useState, useCallback } from 'react';
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

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/admin/status', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (res.status === 401) { onLogout(); return; }
    if (res.ok) setStatus(await res.json());
  }, [token, onLogout]);

  const fetchSchedule = useCallback(async () => {
    const res = await fetch('/api/schedule');
    if (res.ok) setSchedule(await res.json());
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchSchedule();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchSchedule]);

  function dismissToast() { setToast(null); }

  // ── Unlock ───────────────────────────────────────────────────────────────
  async function handleUnlock(date: string) {
    // Check submission count for this date
    const submittedForDate = status?.open_day === date ? status.submitted_count : 0;
    setDialog({
      title: `Atbloķēt spēles ${formatDateShortLv(date)}?`,
      warning: submittedForDate > 0
        ? `⚠️ Šai dienai jau ir ${submittedForDate} iesniegumi. Vai tiešām vēlaties atbloķēt?`
        : undefined,
      onConfirm: async () => {
        setDialog(null);
        const res = await fetch('/api/admin/unlock', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ date }) });
        if (res.ok) {
          setToast({ message: `Atbloķēts: ${formatDateShortLv(date)}`, variant: 'success' });
          fetchStatus();
        } else {
          setToast({ message: 'Kļūda. Mēģini vēlreiz.', variant: 'error' });
        }
      },
    });
  }

  // ── Lock ─────────────────────────────────────────────────────────────────
  async function handleLock() {
    const count = status?.submitted_count ?? 0;
    setDialog({
      title: `Aizvērt prognozēšanu ${formatDateShortLv(status?.open_day ?? '')}?`,
      warning: count > 0 ? `⚠️ Šai dienai jau ir ${count} iesniegumi.` : undefined,
      onConfirm: async () => {
        setDialog(null);
        const res = await fetch('/api/admin/lock', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
        if (res.ok) {
          setToast({ message: 'Diena aizvērta.', variant: 'success' });
          fetchStatus();
        } else {
          setToast({ message: 'Kļūda. Mēģini vēlreiz.', variant: 'error' });
        }
      },
    });
  }

  // ── Save result ──────────────────────────────────────────────────────────
  async function handleSaveResult(game: Game) {
    const inp = resultInputs[game.game_id] ?? { home: '', away: '', winner: '' };
    const body = game.stage === 'group'
      ? { game_id: game.game_id, actual_home: parseInt(inp.home, 10), actual_away: parseInt(inp.away, 10), winner: null }
      : { game_id: game.game_id, actual_home: null, actual_away: null, winner: inp.winner };

    const confirmText = game.stage === 'group'
      ? `Saglabāt rezultātu: ${game.home_team} ${inp.home} - ${inp.away} ${game.away_team}?`
      : `Saglabāt rezultātu: ${inp.winner} uzvarēja?`;

    setDialog({
      title: confirmText,
      onConfirm: async () => {
        setDialog(null);
        const res = await fetch('/api/admin/result', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) {
          setToast({ message: 'Rezultāts saglabāts!', variant: 'success' });
          fetchSchedule();
          // Clear inputs for this game
          setResultInputs(prev => { const n = { ...prev }; delete n[game.game_id]; return n; });
        } else {
          const d = await res.json();
          setToast({ message: d.error ?? 'Kļūda. Mēģini vēlreiz.', variant: 'error' });
        }
      },
    });
  }

  // ── All game dates ───────────────────────────────────────────────────────
  const allDates = schedule
    ? [...new Set(schedule.schedule.map(d => d.date))].sort()
    : [];

  // ── Pending result games ─────────────────────────────────────────────────
  const pendingGames = schedule
    ? schedule.schedule.flatMap(d => d.games).filter(g => !g.result)
    : [];
  const completedGames = schedule
    ? schedule.schedule.flatMap(d => d.games).filter(g => g.result)
    : [];

  const showStatusSection = status?.open_day && !status.all_submitted;

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Admin header */}
      <header className="bg-white border-b border-grey-200 px-4 h-14 flex items-center justify-between sticky top-0 z-10">
        <span className="text-base font-semibold text-grey-900">⚽ Totalizators — Admin</span>
        <button onClick={onLogout} className="text-sm text-grey-600 font-medium">Iziet</button>
      </header>

      {/* ── Section 1: Day control ─────────────────────────────────────── */}
      <section className="px-4 pt-6 pb-3">
        <h2 className="text-xl font-bold text-grey-900 mb-3">Dienas Kontrole</h2>
        <div className="space-y-2">
          {allDates.map(date => {
            const st = dateStatus(date, status?.open_day ?? null);
            return (
              <div key={date} className="flex items-center justify-between py-2 border-b border-grey-100">
                <span className="text-sm text-grey-900">{formatDateShortLv(date)}</span>
                <div className="flex items-center gap-3">
                  {st === 'open' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">Atvērts</span>}
                  {st === 'locked' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-grey-100 text-grey-600">Slēgts</span>}
                  {st === 'past' && <span className="text-xs px-2 py-0.5 rounded-full bg-grey-50 text-grey-400">Pagājis</span>}
                  {st === 'open' && (
                    <button onClick={handleLock} className="text-sm font-medium text-red-600 border border-red-300 rounded-lg px-3 py-1.5">
                      Aizvērt
                    </button>
                  )}
                  {st === 'locked' && (
                    <button onClick={() => handleUnlock(date)} className="text-sm font-medium text-brand-green border border-brand-green rounded-lg px-3 py-1.5">
                      Atbloķēt
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 2: Submission status ──────────────────────────────── */}
      {showStatusSection && (
        <section className="px-4 pt-6 pb-3">
          <h2 className="text-xl font-bold text-grey-900 mb-3">
            Iesniegumu Statuss — {formatDateShortLv(status!.open_day!)}
          </h2>
          <div className="space-y-2">
            {status!.members.map(m => (
              <div key={m.member_id} className="flex items-center gap-3 py-2 border-b border-grey-100">
                <span className={`text-lg font-bold w-6 ${m.submitted ? 'text-green-600' : 'text-red-400'}`}>
                  {m.submitted ? '✓' : '✕'}
                </span>
                <span className="text-sm font-medium text-grey-900 flex-1">{m.display_name}</span>
                <span className="text-xs text-grey-500">{m.submitted ? 'iesniegts' : 'nav iesniegts'}</span>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold text-grey-700 mt-3">
            {status!.submitted_count} / {status!.total_count} iesniegts
          </p>
        </section>
      )}

      {/* ── Section 3: Result entry ────────────────────────────────────── */}
      <section className="px-4 pt-6 pb-3">
        <h2 className="text-xl font-bold text-grey-900 mb-3">Rezultātu Ievade</h2>

        {pendingGames.length === 0 && completedGames.length > 0 && (
          <p className="text-sm text-green-700 font-medium py-6 text-center">✓ Visi rezultāti ir ievadīti.</p>
        )}

        {pendingGames.map(game => {
          const inp = resultInputs[game.game_id] ?? { home: '', away: '', winner: '' };
          const canSave = game.stage === 'group'
            ? (inp.home !== '' && inp.away !== '' && !isNaN(parseInt(inp.home, 10)) && !isNaN(parseInt(inp.away, 10)))
            : inp.winner !== '';

          return (
            <div key={game.game_id} className="bg-white border border-grey-200 rounded-xl p-4 mx-0 mb-3 shadow-sm">
              <p className="text-sm font-semibold text-grey-900">{game.home_team} vs {game.away_team}</p>
              <p className="text-xs text-grey-500 mt-0.5">{game.time_eet} EET · {game.round === 'group' ? `Grupa ${game.group}` : game.round}</p>

              {game.stage === 'group' ? (
                <div className="flex items-center justify-center gap-4 mt-4">
                  <input
                    type="number" inputMode="numeric" min={0} max={20}
                    value={inp.home}
                    onChange={e => setResultInputs(p => ({ ...p, [game.game_id]: { ...inp, home: e.target.value } }))}
                    className="w-14 h-12 text-2xl font-bold text-center border-2 border-grey-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xl text-grey-400 font-bold">-</span>
                  <input
                    type="number" inputMode="numeric" min={0} max={20}
                    value={inp.away}
                    onChange={e => setResultInputs(p => ({ ...p, [game.game_id]: { ...inp, away: e.target.value } }))}
                    className="w-14 h-12 text-2xl font-bold text-center border-2 border-grey-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-4">
                  {[game.home_team, game.away_team].map(team => (
                    <button
                      key={team}
                      onClick={() => setResultInputs(p => ({ ...p, [game.game_id]: { ...inp, winner: team } }))}
                      className={`flex-1 h-12 rounded-lg border-2 text-sm font-semibold transition-colors ${
                        inp.winner === team
                          ? 'border-brand-green bg-brand-green-light text-brand-green'
                          : 'border-grey-300 bg-white text-grey-900'
                      }`}
                    >
                      {team}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => handleSaveResult(game)}
                disabled={!canSave}
                className="w-full h-11 mt-4 bg-brand-green text-white rounded-lg font-semibold text-sm disabled:bg-grey-200 disabled:text-grey-400"
              >
                Saglabāt rezultātu
              </button>
            </div>
          );
        })}

        {/* Completed results */}
        {completedGames.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setExpandedResults(p => !p)}
              className="text-sm font-semibold text-grey-600 flex items-center gap-1"
            >
              {expandedResults ? '▲' : '▼'} Ievadīti rezultāti ({completedGames.length})
            </button>
            {expandedResults && (
              <div className="mt-2 space-y-1">
                {completedGames.map(game => (
                  <div key={game.game_id} className="px-0 py-2 flex items-center justify-between border-b border-grey-100">
                    <span className="text-sm text-grey-900">
                      {game.home_team} vs {game.away_team}
                      {' — '}
                      {game.stage === 'group'
                        ? `${game.result?.actual_home} - ${game.result?.actual_away}`
                        : `${game.result?.winner} ✓`}
                    </span>
                    <button
                      onClick={() => {
                        setResultInputs(p => ({
                          ...p,
                          [game.game_id]: {
                            home: game.result?.actual_home != null ? String(game.result.actual_home) : '',
                            away: game.result?.actual_away != null ? String(game.result.actual_away) : '',
                            winner: game.result?.winner ?? '',
                          },
                        }));
                        // Move to pending view by temporarily removing result from schedule
                        // (will re-fetch after save)
                      }}
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
