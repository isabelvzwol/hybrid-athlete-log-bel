/* ---------------- Marathon (onder Doelen) ----------------
   Overzicht van het marathonschema, rechtstreeks uit schedule_entries. Er
   wordt niets gekopieerd: pas je een run aan in Schema, dan zie je dat hier 
   meteen terug.

   - Het doel is de eerstvolgende race met type "Marathon" (tabel races).
   - Het plan beslaat PLAN_WEEKS weken (maandag t/m zondag), waarvan de
     laatste week de raceweek is.
   - Alleen hardloopruns tellen mee, plus het looponderdeel van een Brick.
   - "Gedaan" telt alleen de afstand die je echt hebt gelogd bij afronden.
   - Voorspelde eindtijd: hartslagmethode. Van je gelijkmatige runs uit de
     laatste 8 weken bepalen we het verband tussen hartslag en tempo (een
     rechte lijn). Daaruit volgt het tempo op marathonhartslag (MARATHON_HR,
     met een kleine marge HR_BAND erboven en eronder). Intervallen en runs
     met een tempoblok of warming-up tellen niet mee.
   - De doeltijd staat bij de race (Doelen -> Races -> Bewerken). */
import React, { useState } from 'react';
import { Card, Badge } from '../components/ui.jsx';
import { SimpleLineChart } from '../components/charts.jsx';
import { LogTrainingModal } from '../components/scheduling.jsx';
import { todayISO, addDays, getMonday, daysBetween, formatDateShort, formatDateLong, formatDateWithYear, parseDuration, formatDuration, WEEKDAYS } from '../lib/helpers.js';
var e = React.createElement;

var PLAN_WEEKS = 22;
var RUN_SPORTS = ['Hardlopen', 'Brick'];
var MARATHON_KM = 42.195;
var MARATHON_HR = 160;
var HR_BAND = 2;
var WINDOW_DAYS = 56;
var MIN_RUNS = 6;

/* De eerstvolgende race met type "Marathon". Is er geen aankomende, dan de
   meest recente afgelopen, zodat het overzicht na de race nog te bekijken is. */
export function findGoalRace(races) {
  var list = (races || []).filter(function (r) { return (r.type || '').trim().toLowerCase() === 'marathon'; });
  var upcoming = list.filter(function (r) { return r.date >= todayISO(); }).sort(function (a, b) { return a.date.localeCompare(b.date); });
  if (upcoming.length) return upcoming[0];
  var past = list.sort(function (a, b) { return b.date.localeCompare(a.date); });
  return past[0] || null;
}

function fmtKm(v) {
  if (v == null) return '0';
  var r = Math.round(v * 10) / 10;
  return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)).replace('.', ',');
}

/* Wat er echt gelopen is. Bij een Brick is dat het looponderdeel. */
function actualRun(entry) {
  if (!entry.completed || !entry.actual) return null;
  var a = entry.actual;
  var src = entry.sport === 'Brick' ? (a.run || {}) : a;
  var distance = src.distance != null && src.distance !== '' ? Number(src.distance) : null;
  var sec = parseDuration(src.time);
  var pace = (entry.sport !== 'Brick' && a.pace) ? a.pace : (sec && distance ? formatDuration(sec / distance) : null);
  var hr = src.hr != null && src.hr !== '' ? src.hr : null;
  var gels = a.gels != null && a.gels !== '' ? Number(a.gels) : null;
  return { distance: distance, time: src.time || null, pace: pace, hr: hr, gels: gels };
}

function weekLabelFor(entries, index) {
  var labels = entries.map(function (x) { return x.weekLabel || ''; }).filter(function (l) { return /^Week\s*\d+/i.test(l); });
  return labels.length ? labels[0] : 'Week ' + (index + 1);
}

/* Fase uit het weeklabel, bv. "Week 20 (Taper)" -> "Taper". */
function phaseOf(label) {
  var m = /\(([^)]+)\)/.exec(label || '');
  return m ? m[1] : 'Opbouw';
}

/* Is dit een gelijkmatige run? Intervallen, progressieve runs en runs met
   een warming-up of een tweede tempoblok hebben een gemiddelde dat een mix
   is van rustig en snel, en die laten we weg. Een wedstrijd op een vast
   tempo telt wel mee: de spanning duwt de hartslag iets omhoog, wat de
   voorspelling iets voorzichtiger maakt. */
function isSteadyRun(x) {
  var txt = ((x.type || '') + ' ' + (x.plannedText || '')).toLowerCase();
  if (/interval|progressie|progressief|shake|\bwu\b|\bcd\b|warming|\d\s*x\s*\d/.test(txt)) return false;
  if ((txt.match(/@/g) || []).length >= 2) return false;
  return true;
}

/* Hartslagmethode: rechte lijn door (hartslag, tempo) van je gelijkmatige
   runs uit de laatste WINDOW_DAYS dagen, en daarmee het tempo op
   marathonhartslag. */
function hrPrediction(state) {
  var since = addDays(todayISO(), -WINDOW_DAYS);
  var pts = [];
  (state.scheduleEntries || []).forEach(function (x) {
    if (x.sport !== 'Hardlopen' || !x.completed || !x.actual || x.date < since || x.date > todayISO()) return;
    var a = x.actual;
    var hr = Number(a.hr), km = Number(a.distance), sec = parseDuration(a.time);
    var pace = parseDuration(a.pace) || (sec && km ? sec / km : null);
    if (!(hr >= 110 && hr <= 190) || !(km >= 3) || !pace) return;
    if (!isSteadyRun(x)) return;
    pts.push({ hr: hr, pace: pace, date: x.date });
  });
  var n = pts.length;
  if (n < MIN_RUNS) return { ok: false, n: n, pts: pts };
  var mx = pts.reduce(function (t, p) { return t + p.hr; }, 0) / n;
  var my = pts.reduce(function (t, p) { return t + p.pace; }, 0) / n;
  var sxx = 0, sxy = 0;
  pts.forEach(function (p) { sxx += (p.hr - mx) * (p.hr - mx); sxy += (p.hr - mx) * (p.pace - my); });
  var minHr = Math.min.apply(null, pts.map(function (p) { return p.hr; }));
  var maxHr = Math.max.apply(null, pts.map(function (p) { return p.hr; }));
  if (sxx === 0 || maxHr - minHr < 8) return { ok: false, n: n, pts: pts, spread: true };
  var slope = sxy / sxx, icept = my - slope * mx;
  function paceAt(h) { return icept + slope * h; }
  return {
    ok: true, n: n, pts: pts, slope: slope, icept: icept, minHr: minHr, maxHr: maxHr,
    pace: paceAt(MARATHON_HR), fast: paceAt(MARATHON_HR + HR_BAND), slow: paceAt(MARATHON_HR - HR_BAND),
    time: paceAt(MARATHON_HR) * MARATHON_KM, timeFast: paceAt(MARATHON_HR + HR_BAND) * MARATHON_KM, timeSlow: paceAt(MARATHON_HR - HR_BAND) * MARATHON_KM,
    extrapolated: MARATHON_HR > maxHr
  };
}

/* Puntenwolk hartslag tegen tempo, met de lijn en de marathonhartslag. */
function HrPaceChart(props) {
  var p = props.pred;
  var w = 300, h = 140, pad = 22;
  var hrs = p.pts.map(function (x) { return x.hr; }).concat([MARATHON_HR + HR_BAND, MARATHON_HR - HR_BAND]);
  var paces = p.pts.map(function (x) { return x.pace; }).concat([p.fast, p.slow]);
  var x0 = Math.min.apply(null, hrs) - 3, x1 = Math.max.apply(null, hrs) + 3;
  var y0 = Math.min.apply(null, paces) - 10, y1 = Math.max.apply(null, paces) + 10;
  function X(v) { return pad + (v - x0) / (x1 - x0) * (w - pad - 6); }
  function Y(v) { return 6 + (v - y0) / (y1 - y0) * (h - pad - 6); }
  return e('svg', { viewBox: '0 0 ' + w + ' ' + h, style: { width: '100%', height: h + 'px' } },
    e('rect', { x: X(MARATHON_HR - HR_BAND), y: 6, width: X(MARATHON_HR + HR_BAND) - X(MARATHON_HR - HR_BAND), height: h - pad - 6, fill: 'var(--amber-bg)' }),
    e('line', { x1: X(x0), y1: Y(p.icept + p.slope * x0), x2: X(x1), y2: Y(p.icept + p.slope * x1), stroke: 'var(--slate)', strokeWidth: 1.5 }),
    p.pts.map(function (pt, i) { return e('circle', { key: i, cx: X(pt.hr), cy: Y(pt.pace), r: 3, fill: 'var(--sage)' }); }),
    e('circle', { cx: X(MARATHON_HR), cy: Y(p.pace), r: 4, fill: 'var(--amber)' }),
    e('text', { x: X(MARATHON_HR), y: h - 6, fontSize: '8', textAnchor: 'middle', fill: 'var(--text-tertiary)' }, 'HR ' + MARATHON_HR),
    e('text', { x: pad, y: h - 6, fontSize: '8', fill: 'var(--text-tertiary)' }, 'HR ' + Math.round(x0)),
    e('text', { x: w - 4, y: h - 6, fontSize: '8', textAnchor: 'end', fill: 'var(--text-tertiary)' }, 'HR ' + Math.round(x1)),
    e('text', { x: 2, y: 12, fontSize: '8', fill: 'var(--text-tertiary)' }, formatDuration(y0)),
    e('text', { x: 2, y: h - pad, fontSize: '8', fill: 'var(--text-tertiary)' }, formatDuration(y1))
  );
}

function buildWeeks(state, goal) {
  var raceMonday = getMonday(goal.date);
  var start = addDays(raceMonday, -7 * (PLAN_WEEKS - 1));
  var raceByDate = {};
  (state.races || []).forEach(function (r) { raceByDate[r.date] = r; });
  var weeks = [];
  for (var i = 0; i < PLAN_WEEKS; i++) {
    var monday = addDays(start, 7 * i);
    var sunday = addDays(monday, 6);
    var inWeek = state.scheduleEntries.filter(function (x) { return x.date >= monday && x.date <= sunday; });
    var runs = inWeek.filter(function (x) { return RUN_SPORTS.indexOf(x.sport) >= 0; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); })
      .map(function (x) {
        var act = actualRun(x);
        var status = x.completed ? 'done' : (x.date < todayISO() ? 'missed' : 'planned');
        var race = raceByDate[x.date] || null;
        return { entry: x, actual: act, status: status, race: race, isRace: !!race || x.type === 'Race day' };
      });
    var planned = runs.reduce(function (s, r) { return s + (r.entry.distance || 0); }, 0);
    var done = runs.reduce(function (s, r) { return s + (r.actual && r.actual.distance ? r.actual.distance : 0); }, 0);
    var longestPlanned = runs.filter(function (r) { return r.entry.sport === 'Hardlopen'; }).reduce(function (m, r) { return Math.max(m, r.entry.distance || 0); }, 0);
    var longestDone = runs.filter(function (r) { return r.entry.sport === 'Hardlopen'; }).reduce(function (m, r) { return Math.max(m, r.actual && r.actual.distance ? r.actual.distance : 0); }, 0);
    var weekRaces = (state.races || []).filter(function (r) { return r.date >= monday && r.date <= sunday; });
    weeks.push({
      index: i, monday: monday, sunday: sunday, label: weekLabelFor(inWeek, i), runs: runs,
      planned: planned, done: done, longestPlanned: longestPlanned, longestDone: longestDone,
      hasRace: weekRaces.length > 0 || runs.some(function (r) { return r.isRace; }),
      isCurrent: todayISO() >= monday && todayISO() <= sunday
    });
  }
  return weeks;
}

function WeekChart(props) {
  var weeks = props.weeks;
  var w = 300, h = 120, top = 14, bottom = 14;
  var maxV = Math.max.apply(null, weeks.map(function (x) { return Math.max(x.planned, x.done); }).concat([1]));
  var slot = w / weeks.length;
  var barW = slot - 3;
  function hFor(v) { return (v / maxV) * (h - top - bottom); }
  return e('div', {},
    e('svg', { viewBox: '0 0 ' + w + ' ' + h, style: { width: '100%', height: h + 'px' } },
      weeks.map(function (wk, i) {
        var x = i * slot + 1.5;
        var ph = hFor(wk.planned), dh = hFor(Math.min(wk.done, Math.max(wk.planned, wk.done)));
        return e('g', { key: i },
          e('rect', { x: x, y: h - bottom - ph, width: barW, height: Math.max(ph, 1), rx: 1.5, fill: 'var(--bg-elevated)', stroke: wk.isCurrent ? 'var(--slate)' : 'none', strokeWidth: wk.isCurrent ? 1 : 0 }),
          wk.done > 0 ? e('rect', { x: x, y: h - bottom - dh, width: barW, height: dh, rx: 1.5, fill: 'var(--sage)' }) : null,
          wk.hasRace ? e('text', { x: x + barW / 2, y: h - bottom - ph - 3, fontSize: '7', textAnchor: 'middle' }, '🏁') : null,
          (i === 0 || i === weeks.length - 1 || (i + 1) % 5 === 0) ? e('text', { x: x + barW / 2, y: h - 3, fontSize: '7', textAnchor: 'middle', fill: 'var(--text-tertiary)' }, '' + (i + 1)) : null
        );
      })
    ),
    e('div', { className: 'flex items-center justify-center gap-4 text-[10px] mt-1', style: { color: 'var(--text-tertiary)' } },
      e('span', {}, e('span', { style: { display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--bg-elevated)', marginRight: 4 } }), 'gepland'),
      e('span', {}, e('span', { style: { display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--sage)', marginRight: 4 } }), 'gelogd'),
      e('span', {}, '🏁 race')
    )
  );
}

function StatusDot(props) {
  var s = props.status;
  if (s === 'done') return e('div', { className: 'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs', style: { background: 'var(--sage)', color: '#12180F' } }, '✓');
  if (s === 'missed') return e('div', { className: 'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs', style: { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' } }, '✕');
  return e('div', { className: 'w-6 h-6 rounded-full shrink-0', style: { border: '1.5px solid var(--border)' } });
}

function RunRow(props) {
  var r = props.run, x = r.entry, a = r.actual;
  var dayLabel = WEEKDAYS[new Date(x.date + 'T12:00:00').getDay()] + ' ' + formatDateShort(x.date);
  var actualLine = null;
  if (r.status === 'done') {
    if (a && a.distance) {
      actualLine = e('div', { className: 'text-xs mt-0.5', style: { color: 'var(--sage-strong)' } },
        'Gelopen: ' + [fmtKm(a.distance) + ' km', a.pace ? a.pace + '/km' : null, a.hr != null ? 'HR ' + a.hr : null, a.gels ? a.gels + (a.gels === 1 ? ' gel' : ' gels') : null].filter(Boolean).join(' · '));
    } else {
      actualLine = e('div', { className: 'text-xs mt-0.5', style: { color: 'var(--amber)' } }, 'Afgerond, geen afstand ingevuld');
    }
  } else if (r.status === 'missed') {
    actualLine = e('div', { className: 'text-xs mt-0.5', style: { color: 'var(--danger)' } }, 'Niet afgerond');
  }
  return e('div', { onClick: function () { props.onOpen(x); }, className: 'flex items-start gap-3 py-2.5 cursor-pointer', style: { borderTop: props.first ? 'none' : '1px solid var(--border-soft)' } },
    e(StatusDot, { status: r.status }),
    e('div', { className: 'flex-1 min-w-0' },
      e('div', { className: 'flex items-center gap-1.5 flex-wrap' },
        e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, dayLabel),
        e('span', { className: 'text-sm font-semibold' }, (r.isRace ? '🏁 ' : '') + (r.race ? r.race.name : x.type)),
        x.sport === 'Brick' ? e(Badge, { tone: 'slate' }, 'brick') : null
      ),
      x.plannedText ? e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, x.plannedText) : null,
      actualLine
    ),
    e('div', { className: 'text-xs shrink-0 pt-0.5', style: { color: 'var(--text-tertiary)' } }, x.distance ? fmtKm(x.distance) + ' km' : '')
  );
}

function WeekRow(props) {
  var wk = props.week;
  var pct = wk.planned > 0 ? Math.min(100, Math.round((wk.done / wk.planned) * 100)) : 0;
  return e('div', { style: { borderTop: props.first ? 'none' : '1px solid var(--border-soft)' } },
    e('button', { onClick: props.onToggle, className: 'w-full flex items-center gap-2 py-3 text-left' },
      e('span', { className: 'text-xs w-3', style: { color: 'var(--text-tertiary)' } }, props.open ? '▾' : '▸'),
      e('div', { className: 'flex-1 min-w-0' },
        e('div', { className: 'flex items-center gap-2' },
          e('span', { className: 'text-sm font-semibold' }, wk.label),
          wk.isCurrent ? e(Badge, { tone: 'slate' }, 'nu') : null,
          wk.hasRace ? e('span', { className: 'text-xs' }, '🏁') : null
        ),
        e('div', { className: 'text-[11px]', style: { color: 'var(--text-tertiary)' } }, formatDateShort(wk.monday) + ' – ' + formatDateShort(wk.sunday) + (wk.longestPlanned ? ' · langste ' + fmtKm(wk.longestPlanned) + ' km' : ''))
      ),
      e('div', { className: 'text-right shrink-0' },
        e('div', { className: 'text-sm font-semibold' }, fmtKm(wk.done) + ' / ' + fmtKm(wk.planned) + ' km'),
        e('div', { className: 'h-1 rounded-full mt-1 overflow-hidden', style: { background: 'var(--bg-inset)', width: '72px', marginLeft: 'auto' } },
          e('div', { className: 'h-full rounded-full', style: { width: pct + '%', background: 'var(--sage)' } })
        )
      )
    ),
    props.open ? e('div', { className: 'pl-5 pb-2' },
      wk.runs.length ? wk.runs.map(function (r, i) { return e(RunRow, { key: r.entry.id, run: r, first: i === 0, onOpen: props.onOpenEntry }); })
        : e('p', { className: 'text-xs pb-2', style: { color: 'var(--text-tertiary)' } }, 'Geen runs gepland deze week.')
    ) : null
  );
}

function Section(props) {
  return e('div', { className: 'flex flex-col gap-2' },
    e('div', { className: 'text-sm font-semibold' }, props.title),
    props.children
  );
}

export function MarathonView(props) {
  var s = props.state;
  var goal = findGoalRace(s.races);
  var stOpen = useState(-1); var openWeek = stOpen[0], setOpenWeek = stOpen[1];
  var stEntry = useState(null); var openEntryId = stEntry[0], setOpenEntryId = stEntry[1];

  if (!goal) {
    return e(Card, { className: 'p-4' },
      e('div', { className: 'text-sm font-semibold mb-1' }, 'Geen marathon gepland'),
      e('p', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, 'Voeg onder Races een race toe met als type "Marathon". Dan verschijnt hier je schema.')
    );
  }

  var weeks = buildWeeks(s, goal);
  var current = weeks.find(function (w) { return w.isCurrent; }) || null;
  var allRuns = [];
  weeks.forEach(function (w) { allRuns = allRuns.concat(w.runs); });
  var totalPlanned = weeks.reduce(function (t, w) { return t + w.planned; }, 0);
  var totalDone = weeks.reduce(function (t, w) { return t + w.done; }, 0);
  var runsDone = allRuns.filter(function (r) { return r.status === 'done'; }).length;
  var runsMissed = allRuns.filter(function (r) { return r.status === 'missed'; }).length;
  var noDistance = allRuns.filter(function (r) { return r.status === 'done' && !(r.actual && r.actual.distance); });
  var gelRuns = allRuns.filter(function (r) { return r.actual && r.actual.gels; });
  var gelTotal = gelRuns.reduce(function (t, r) { return t + r.actual.gels; }, 0);
  var daysLeft = daysBetween(todayISO(), goal.date);
  var goalTime = goal.result && goal.result.goalTime ? goal.result.goalTime : null;
  var goalSec = parseDuration(goalTime);
  var pred = hrPrediction(s);
  var phase = current ? phaseOf(current.label) : (todayISO() < weeks[0].monday ? 'Nog niet begonnen' : 'Afgerond');
  var longPoints = weeks.map(function (w) { return { label: 'wk ' + (w.index + 1), value: w.longestPlanned }; });
  var openEntry = openEntryId ? s.scheduleEntries.find(function (x) { return x.id === openEntryId; }) : null;
  function openRun(x) { setOpenEntryId(x.id); }
  function diffLabel(sec) {
    if (!goalSec) return null;
    var d = Math.round(sec - goalSec);
    var abs = Math.abs(d);
    var txt = abs < 60 ? abs + ' sec' : formatDuration(abs) + ' min';
    return d <= 0 ? txt + ' onder je doel' : txt + ' boven je doel';
  }

  return e('div', { className: 'flex flex-col gap-5' },
    /* 1. Kop: doel, dagen, fase en voorspelling */
    e(Card, { className: 'p-4' },
      e('div', { className: 'flex items-start justify-between gap-2' },
        e('div', {},
          e('div', { className: 'text-sm font-semibold' }, goal.name),
          e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, formatDateLong(goal.date))
        ),
        e(Badge, { tone: 'amber' }, daysLeft > 0 ? 'nog ' + daysLeft + ' dagen' : (daysLeft === 0 ? 'vandaag!' : 'geweest'))
      ),
      e('div', { className: 'grid grid-cols-2 gap-2 mt-4' },
        e('div', { className: 'rounded-xl p-3', style: { background: 'var(--bg-inset)' } },
          e('div', { className: 'text-[11px]', style: { color: 'var(--text-tertiary)' } }, 'Doel'),
          e('div', { className: 'font-display text-lg font-semibold' }, goalTime ? 'onder ' + goalTime : '—'),
          e('div', { className: 'text-[11px]', style: { color: 'var(--text-tertiary)' } }, goalSec ? formatDuration(goalSec / MARATHON_KM) + '/km' + (goal.targetPace ? ' · racetempo ' + goal.targetPace : '') : 'vul in bij Races → Bewerken')
        ),
        e('div', { className: 'rounded-xl p-3', style: { background: 'var(--bg-inset)' } },
          e('div', { className: 'text-[11px]', style: { color: 'var(--text-tertiary)' } }, 'Voorspelling'),
          e('div', { className: 'font-display text-lg font-semibold', style: { color: pred.ok && goalSec && pred.time > goalSec ? 'var(--amber)' : 'var(--sage-strong)' } }, pred.ok ? formatDuration(pred.time, true) : '—'),
          e('div', { className: 'text-[11px]', style: { color: 'var(--text-tertiary)' } }, pred.ok ? formatDuration(pred.timeFast, true) + ' tot ' + formatDuration(pred.timeSlow, true) : 'nog te weinig runs')
        )
      ),
      e('div', { className: 'flex items-center justify-between mt-3 text-xs', style: { color: 'var(--text-secondary)' } },
        e('span', {}, 'Fase: ' + phase + (current ? ' · ' + current.label.replace(/\s*\(.*\)/, '') : '')),
        e('span', {}, fmtKm(totalDone) + ' / ' + fmtKm(totalPlanned) + ' km · ' + runsDone + '/' + allRuns.length + ' runs' + (runsMissed ? ' · ' + runsMissed + ' gemist' : ''))
      ),
      e('div', { className: 'mt-3 pt-3', style: { borderTop: '1px solid var(--border-soft)' } },
        pred.ok ? e('div', { className: 'flex flex-col gap-1' },
          e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } },
            'Op HR ' + MARATHON_HR + ' loop je ongeveer ' + formatDuration(pred.pace) + '/km (HR ' + (MARATHON_HR - HR_BAND) + ' tot ' + (MARATHON_HR + HR_BAND) + ': ' + formatDuration(pred.slow) + ' tot ' + formatDuration(pred.fast) + '/km).' + (diffLabel(pred.time) ? ' Dat is ' + diffLabel(pred.time) + '.' : '')),
          e(HrPaceChart, { pred: pred }),
          e('div', { className: 'text-[11px]', style: { color: 'var(--text-tertiary)' } },
            'Op basis van ' + pred.n + ' gelijkmatige runs uit de laatste 8 weken (hartslag ' + pred.minHr + ' tot ' + pred.maxHr + '). Intervallen en runs met een tempoblok tellen niet mee. ' +
            (pred.extrapolated ? 'Let op: je hebt nog geen gelijkmatige runs rond HR ' + MARATHON_HR + ', dus dit is doorgetrokken. ' : '') +
            'In een marathon stijgt je hartslag geleidelijk bij hetzelfde tempo, dus zie dit als de snelle kant van wat haalbaar is.')
        ) : e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } },
          pred.spread ? 'Je runs uit de laatste 8 weken hebben bijna allemaal dezelfde hartslag. Voor een voorspelling zijn ook rustige runs en snellere gelijkmatige runs nodig.'
            : 'Nog ' + (MIN_RUNS - pred.n) + ' gelijkmatige runs met tempo en hartslag nodig voor een voorspelling (laatste 8 weken).')
      )
    ),

    /* 2. Signalen (alleen als er iets is) */
    noDistance.length ? e(Card, { className: 'p-4', style: { background: 'var(--amber-bg)', border: '1px solid var(--amber)' } },
      e('div', { className: 'text-sm font-semibold mb-1', style: { color: 'var(--amber)' } }, '⚠️ Afgerond zonder afstand'),
      e('div', { className: 'text-xs mb-2', style: { color: 'var(--text-secondary)' } }, 'Deze runs tellen nu voor 0 km. Tik om de afstand aan te vullen.'),
      noDistance.map(function (r) {
        return e('button', { key: r.entry.id, onClick: function () { openRun(r.entry); }, className: 'w-full text-left text-xs py-1', style: { color: 'var(--text-primary)' } },
          formatDateShort(r.entry.date) + ' · ' + r.entry.type + ' ▸');
      })
    ) : null,

    /* 3. Deze week */
    current ? e(Section, { title: 'Deze week · ' + current.label },
      e(Card, { className: 'px-4 py-1' },
        e('div', { className: 'flex items-center justify-between py-2 text-xs', style: { color: 'var(--text-secondary)' } },
          e('span', {}, formatDateShort(current.monday) + ' – ' + formatDateShort(current.sunday)),
          e('span', { className: 'font-semibold', style: { color: 'var(--text-primary)' } }, fmtKm(current.done) + ' / ' + fmtKm(current.planned) + ' km')
        ),
        current.runs.length ? current.runs.map(function (r) { return e(RunRow, { key: r.entry.id, run: r, first: false, onOpen: openRun }); })
          : e('p', { className: 'text-xs pb-2', style: { color: 'var(--text-tertiary)' } }, 'Geen runs gepland deze week.')
      )
    ) : null,

    /* 4. Grafieken */
    e(Section, { title: 'Opbouw' },
      e(Card, { className: 'p-4' },
        e('div', { className: 'text-xs font-semibold mb-2', style: { color: 'var(--text-secondary)' } }, 'Km per week'),
        e(WeekChart, { weeks: weeks })
      ),
      e(Card, { className: 'p-4' },
        e('div', { className: 'text-xs font-semibold mb-2', style: { color: 'var(--text-secondary)' } }, 'Langste duurloop per week (gepland, km)'),
        e(SimpleLineChart, { points: longPoints, note: 'Week 1 tot en met ' + PLAN_WEEKS })
      )
    ),

    /* 5. Alle weken (ingeklapt) */
    e(Section, { title: 'Alle weken' },
      e(Card, { className: 'px-4 py-1' },
        weeks.map(function (wk, i) {
          return e(WeekRow, { key: wk.monday, week: wk, first: i === 0, open: openWeek === i,
            onToggle: function () { setOpenWeek(openWeek === i ? -1 : i); },
            onOpenEntry: openRun });
        })
      )
    ),

    /* 6. Racevoorbereiding */
    e(Section, { title: 'Racevoorbereiding' },
      e(Card, { className: 'p-4 flex flex-col gap-2' },
        e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } },
          gelRuns.length ? 'Voeding geoefend: ' + gelRuns.length + (gelRuns.length === 1 ? ' run' : ' runs') + ' met gels, ' + gelTotal + ' gels in totaal.' : 'Nog geen gels gelogd. Vul het aantal in bij het afronden van een long run of wedstrijd.'),
        e('button', { onClick: function () { props.onOpenRace(goal); }, className: 'text-xs font-medium text-left', style: { color: 'var(--slate)' } }, 'Racedetails: pacing, gels en voeding ▸')
      )
    ),

    openEntry ? e(LogTrainingModal, { entry: openEntry, onClose: function () { setOpenEntryId(null); },
      onSave: function (id, actual) { props.completeEntry(id, actual); setOpenEntryId(null); },
      onUncomplete: props.uncompleteEntry, onUpdateEntry: props.updateEntry, onDeleteEntry: props.deleteEntry, races: s.races, onAddRace: props.addRace,
      strengthLogs: s.strengthLogs, strengthTemplates: s.strengthTemplates, onSaveStrengthLog: props.addStrengthLog, hyroxLibrary: s.hyroxLibrary, onSaveHyroxLog: props.addHyroxLog }) : null
  );
}
