/* ---------------- generic helpers ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html, met één
   bewuste wijziging: uid() geeft nu een echte UUID terug (crypto.randomUUID)
   in plaats van een tijdstempel-string, zodat dezelfde waarde direct als
   Postgres uuid-kolom (id) gebruikt kan worden bij het inserten in Supabase. */

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // fallback voor zeer oude browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    var v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function pad(n) { return n < 10 ? '0' + n : '' + n; }
export function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export function toDate(iso) { var p = iso.split('-'); return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])); }
export function daysBetween(aIso, bIso) { var a = toDate(aIso), b = toDate(bIso); return Math.round((b - a) / 86400000); }
export var WEEKDAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
export var WEEKDAYS_FULL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
export var MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export function formatDateShort(iso) { var d = toDate(iso); return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); }
export function formatDateLong(iso) { var d = toDate(iso); return WEEKDAYS_FULL[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
export function weekdayLetter(iso) { return WEEKDAYS[toDate(iso).getDay()]; }
export function getMonday(iso) { var d = toDate(iso); var day = d.getDay(); var diff = day === 0 ? -6 : 1 - day; var m = new Date(d); m.setDate(d.getDate() + diff); return m.getFullYear() + '-' + pad(m.getMonth() + 1) + '-' + pad(m.getDate()); }
export function addDays(iso, n) { var d = toDate(iso); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export function addMonthsToMonthKey(monthKey, n) { var p = monthKey.split('-'); var y = parseInt(p[0]), m = parseInt(p[1]) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + pad(m + 1); }
export function monthKeyOf(iso) { return iso.slice(0, 7); }
export function monthLabel(monthKey) { var p = monthKey.split('-'); return MONTHS[parseInt(p[1]) - 1] + ' ' + p[0]; }
export function parseDuration(str) {
  if (!str) return null;
  var parts = String(str).split(':').map(function (x) { return parseFloat(x); });
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
export function formatDuration(totalSeconds, forceHours) {
  if (totalSeconds == null || isNaN(totalSeconds)) return '-';
  totalSeconds = Math.round(totalSeconds);
  var hrs = Math.floor(totalSeconds / 3600);
  var rem = totalSeconds % 3600;
  var mins = Math.floor(rem / 60);
  var secs = rem % 60;
  if (hrs > 0 || forceHours) return hrs + ':' + pad(mins) + ':' + pad(secs);
  return mins + ':' + pad(secs);
}
export function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
export function yearOf(iso) { return iso.slice(0, 4); }
export function formatDateWithYear(iso) { return formatDateShort(iso) + ' ' + yearOf(iso); }
export function isoWeekNumber(iso) {
  var d = toDate(iso);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  var week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
export function avgOf(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null; }
