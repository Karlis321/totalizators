// Format ISO date string → Latvian "Piektdiena, 12. jūnijs"
export function formatDateLv(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat('lv-LV', { weekday: 'long', timeZone: 'UTC' }).format(d);
  const day = d.getUTCDate();
  const month = new Intl.DateTimeFormat('lv-LV', { month: 'long', timeZone: 'UTC' }).format(d);
  // Capitalise weekday
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day}. ${month}`;
}

// Format ISO date string → short "12. jūnijs"
export function formatDateShortLv(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDate();
  const month = new Intl.DateTimeFormat('lv-LV', { month: 'long', timeZone: 'UTC' }).format(d);
  return `${day}. ${month}`;
}

// Format ISO UTC timestamp → Latvian "18. jūnijs, 23:14"
export function formatTimestampLv(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const day = new Intl.DateTimeFormat('lv-LV', { day: 'numeric', month: 'long', timeZone: 'Europe/Riga' }).format(d);
  const time = new Intl.DateTimeFormat('lv-LV', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Riga', hour12: false }).format(d);
  return `${day}, ${time}`;
}

// Today's date string in YYYY-MM-DD (EET)
export function todayEET(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Riga' });
}

// Round value → Latvian label
export function roundLabel(round: string, group: string): string {
  if (round === 'group') return `${group} rinda`;
  const map: Record<string, string> = {
    round_of_32:   '1/32 fināls',
    round_of_16:   '1/16 fināls',
    quarter_final: 'Ceturtdaļfināls',
    semi_final:    'Pusfināls',
    third_place:   'Bronzas spēle',
    final:         'Fināls',
  };
  return map[round] ?? round;
}

// Points → Latvian grammar "3 punkti" / "1 punkts"
export function pointsLabel(pts: number): string {
  if (pts === 1) return '1 punkts';
  return `${pts} punkti`;
}
