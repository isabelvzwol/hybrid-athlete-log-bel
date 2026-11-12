/* ---------------- Marathon (onder Doelen) ----------------
   Overzicht van het marathonschema, rechtstreeks uit schedule_entries. Er
   wordt niets gekopieerd: pas je een run aan in Schema, dan zie je dat hier 
   meteen terug.

   - Het doel is de eerstvolgende race met type "Marathon" (tabel races).
   - Het plan beslaat PLAN_WEEKS weken (maandag t/m zondag), waarvan de
     laatste week de raceweek is.
   - Alleen hardloopruns tellen mee, plus het looponderdeel van een Brick.
   - "Gedaan" telt alleen de afstand die je echt hebt gelogd bij afronden.
   - Voorspelde eindtijd: Riegel-formule (T2 = T1 x (42,195 / D1)^1,06) op
     je recente races van 10 km of langer. Dit is een indicatie.
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
var PREDICTION_DAYS = 180;

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

/* Recente race-uitslagen (10 km of langer) en de marathontijd die daarbij
   past volgens Riegel. Bronnen: je records (PRs) en afgeronde runs op de
   dag van een race. */
function racePredictions(state) {
  var since = addDays(todayISO(), -PREDICTION_DAYS);
  var out = [];
  (state.runRaceResults || []).forEach(function (r) {
    var sec = parseDuration(r.time);
    if (r.km >= 10 && sec && r.date >= since) out.push({ date: r.date, km: r.km, sec: sec, label: (r.km === 21.1 ? 'Halve marathon' : fmtKm(r.km) + ' km') });
  });
  var raceByDate = {};
  (state.races || []).forEach(function (r) { raceByDate[r.date] = r; });
  (state.scheduleEntries || []).forEach(function (x) {
    if (x.sport !== 'Hardlopen' || !x.completed || !x.actual || !raceByDate[x.date] || x.date < since) return;
    var km = Number(x.actual.distance), sec = parseDuration(x.actual.time);
    if (!(km >= 10) || !sec) return;
    if (out.some(function (o) { return o.date === x.date; })) return;
    out.push({ date: x.date, km: km, sec: sec, label: raceByDate[x.date].name });
  });
  out.forEach(function (o) { o.predicted = o.sec * Math.pow(MARATHON_KM / o.km, 1.06); });
  return out.sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 3);
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
  var predictions = racePredictions(s);
  var latest = predictions[0] || null;
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
          e('div', { className: 'font-display text-lg font-semibold', style: { color: latest && goalSec && latest.predicted > goalSec ? 'var(--amber)' : 'var(--sage-strong)' } }, latest ? formatDuration(latest.predicted, true) : '—'),
          e('div', { className: 'text-[11px]', style: { color: 'var(--text-tertiary)' } }, latest ? 'op basis van ' + latest.label : 'nog geen recente race')
        )
      ),
      e('div', { className: 'flex items-center justify-between mt-3 text-xs', style: { color: 'var(--text-secondary)' } },
        e('span', {}, 'Fase: ' + phase + (current ? ' · ' + current.label.replace(/\s*\(.*\)/, '') : '')),
        e('span', {}, fmtKm(totalDone) + ' / ' + fmtKm(totalPlanned) + ' km · ' + runsDone + '/' + allRuns.length + ' runs' + (runsMissed ? ' · ' + runsMissed + ' gemist' : ''))
      ),
      predictions.length ? e('div', { className: 'mt-3 pt-3', style: { borderTop: '1px solid var(--border-soft)' } },
        predictions.map(function (p, i) {
          return e('div', { key: i, className: 'flex items-center justify-between text-xs py-0.5' },
            e('span', { style: { color: 'var(--text-secondary)' } }, p.label + ' · ' + formatDateWithYear(p.date) + ' · ' + formatDuration(p.sec, true)),
            e('span', { className: 'font-semibold' }, formatDuration(p.predicted, true))
          );
        }),
        latest && diffLabel(latest.predicted) ? e('div', { className: 'text-xs mt-1', style: { color: 'var(--text-secondary)' } }, 'Laatste voorspelling: ' + diffLabel(latest.predicted) + '.') : null,
        e('div', { className: 'text-[11px] mt-1', style: { color: 'var(--text-tertiary)' } }, 'Indicatie. Een marathon valt vaak trager uit dan deze formule. Liep je een race niet voluit, dan is de voorspelling juist te traag.')
      ) : null
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
