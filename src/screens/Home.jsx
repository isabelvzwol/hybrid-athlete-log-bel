/* ---------------- Home-tab ----------------
   Oorspronkelijk 1-op-1 overgenomen uit de originele hybrid-athlete-app.html.
   Wedstrijden staan nu onder Doelen -> Races. Bovenaan staat een aftelling
   naar je marathon (tik erop voor het overzicht onder Doelen). Klachten en
   gewicht zitten achter het kleine blok Gezondheid. */
import React, { useState } from 'react';
import { Card, Modal } from '../components/ui.jsx';
import { SimpleBarChart } from '../components/charts.jsx';
import { DayCard, RestDayCard, LogTrainingModal, AddScheduleEntryModal } from '../components/scheduling.jsx';
import { enduranceArchiveItems } from '../lib/domain.js';
import { todayISO, daysBetween, addDays, getMonday, isoWeekNumber, formatDateShort, formatDateLong, toDate, WEEKDAYS_FULL } from '../lib/helpers.js';
import { findGoalRace } from './Marathon.jsx';
import { GezondheidTab } from './Gezondheid.jsx';
var e = React.createElement;

function GoalCountdown(props) {
  var goal = findGoalRace(props.races);
  if (!goal) return null;
  var d = daysBetween(todayISO(), goal.date);
  if (d < 0) return null;
  return e(Card, { onClick: props.onOpen, className: 'p-4 cursor-pointer flex items-center justify-between gap-3' },
    e('div', { className: 'min-w-0' },
      e('div', { className: 'text-sm font-semibold truncate' }, '🏁 ' + goal.name),
      e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, formatDateLong(goal.date) + (goal.targetPace ? ' · doel ' + goal.targetPace + '/km' : ''))
    ),
    e('div', { className: 'text-right shrink-0' },
      e('div', { className: 'font-display text-2xl font-semibold', style: { color: 'var(--sage-strong)' } }, d === 0 ? 'Vandaag!' : d),
      d === 0 ? null : e('div', { className: 'text-[11px]', style: { color: 'var(--text-tertiary)' } }, d === 1 ? 'dag' : 'dagen')
    )
  );
}
function HealthMini(props) {
  var last = (props.complaintLogs || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0] || null;
  return e(Card, { onClick: props.onOpen, className: 'px-4 py-3 cursor-pointer flex items-center justify-between gap-2' },
    e('span', { className: 'text-sm font-medium' }, '❤️ Klachten & gewicht'),
    e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, last ? 'laatste: ' + last.type + ' (' + formatDateShort(last.date) + ') ▸' : 'openen ▸')
  );
}

function Trends(props) {
  var monday = getMonday(todayISO());
  var sunday = addDays(monday, 6);
  var weekEntries = props.entries.filter(function (x) { return x.date >= monday && x.date <= sunday; });
  var done = weekEntries.filter(function (x) { return x.completed; });
  var totalKm = done.reduce(function (s, x) { var d = x.actual && x.actual.distance != null ? x.actual.distance : x.distance; return s + (d || 0); }, 0);
  var hrs = done.filter(function (x) { var h = x.actual && x.actual.hr != null ? x.actual.hr : x.hr; return h; }).map(function (x) { return x.actual && x.actual.hr != null ? x.actual.hr : x.hr; });
  var avgHr = hrs.length ? Math.round(hrs.reduce(function (a, b) { return a + b; }, 0) / hrs.length) : null;
  var pct = weekEntries.length ? Math.round((done.length / weekEntries.length) * 100) : 0;
  return e(Card, { className: 'p-4' },
    e('div', { className: 'flex items-center justify-between mb-3' },
      e('span', { className: 'text-sm font-semibold' }, 'Deze week volgens schema'),
      e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, done.length + '/' + weekEntries.length + ' afgerond')
    ),
    e('div', { className: 'h-1.5 rounded-full mb-4 overflow-hidden', style: { background: 'var(--bg-inset)' } },
      e('div', { className: 'h-full rounded-full', style: { width: pct + '%', background: 'var(--sage)' } })
    ),
    e('div', { className: 'grid grid-cols-3 gap-2 text-center' },
      e('div', {}, e('div', { className: 'font-display text-lg font-semibold', style: { color: 'var(--sage-strong)' } }, totalKm.toFixed(1)), e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'km')),
      e('div', {}, e('div', { className: 'font-display text-lg font-semibold', style: { color: 'var(--sage-strong)' } }, done.length), e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'sessies')),
      e('div', {}, e('div', { className: 'font-display text-lg font-semibold', style: { color: 'var(--sage-strong)' } }, avgHr || '—'), e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'gem. hr'))
    )
  );
}
function MoodTracker(props) {
  // Standaard staat de dag van vandaag geselecteerd; tik op een van de dagen in
  // de balk eronder om achteraf alsnog een dag in te vullen of aan te passen.
  var stSel = useState(todayISO()); var selected = stSel[0], setSelected = stSel[1];
  var current = props.moodLogs.find(function (m) { return m.date === selected; });
  var options = [
    { key: 'green', emoji: '🟢', bg: 'var(--sage-bg)', border: 'var(--sage)' },
    { key: 'orange', emoji: '🟠', bg: 'var(--amber-bg)', border: 'var(--amber)' },
    { key: 'red', emoji: '🔴', bg: 'var(--danger-bg)', border: 'var(--danger)' }
  ];
  var colorMap = { green: 'var(--sage)', orange: 'var(--amber)', red: 'var(--danger)' };
  var byDate = {}; props.moodLogs.forEach(function (m) { byDate[m.date] = m.mood; });
  var last7 = [6, 5, 4, 3, 2, 1, 0].map(function (i) { return addDays(todayISO(), -i); });
  var isToday = selected === todayISO();
  var isYesterday = selected === addDays(todayISO(), -1);
  var title = isToday ? 'Hoe voel ik mij vandaag?'
    : isYesterday ? 'Hoe voelde ik mij gisteren?'
    : 'Hoe voelde ik mij op ' + WEEKDAYS_FULL[toDate(selected).getDay()] + ' ' + formatDateShort(selected) + '?';
  return e(Card, { className: 'p-4' },
    e('div', { className: 'text-sm font-semibold mb-3' }, title),
    e('div', { className: 'flex gap-2' }, options.map(function (o) {
      var active = current && current.mood === o.key;
      return e('button', { key: o.key, onClick: function () { props.onSetMood(o.key, selected); }, className: 'flex-1 rounded-xl py-3 flex items-center justify-center text-2xl',
        style: { background: active ? o.bg : 'var(--bg-inset)', border: active ? ('1.5px solid ' + o.border) : '1px solid var(--border)' } }, o.emoji);
    })),
    e('div', { className: 'flex justify-between gap-1 mt-3' }, last7.map(function (d) {
      var mood = byDate[d];
      var isSel = d === selected;
      return e('button', { key: d, onClick: function () { setSelected(d); }, className: 'flex flex-col items-center gap-1 flex-1 rounded-lg py-1',
        style: { background: isSel ? 'var(--bg-elevated)' : 'transparent', border: isSel ? '1px solid var(--border)' : '1px solid transparent' } },
        e('div', { className: 'w-full h-2 rounded-full', style: { background: mood ? colorMap[mood] : 'var(--bg-inset)' } }),
        e('span', { className: 'text-[10px]', style: { color: isSel ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: isSel ? 600 : 400 } }, WEEKDAYS_FULL[toDate(d).getDay()].slice(0, 2)),
        e('span', { className: 'text-[10px]', style: { color: 'var(--text-tertiary)' } }, toDate(d).getDate())
      );
    })),
    e('div', { className: 'text-[11px] mt-2', style: { color: 'var(--text-tertiary)' } }, 'Tik op een dag om die achteraf in te vullen of aan te passen.')
  );
}
function WeeklyVolumeChart(props) {
  var sports = ['Hardlopen', 'Wielrennen / Kickr', 'Zwemmen'];
  var allItems = [];
  sports.forEach(function (sp) {
    enduranceArchiveItems(props.state, sp).forEach(function (it) {
      allItems.push({ date: it.date, km: sp === 'Zwemmen' ? (it.distance || 0) / 1000 : (it.distance || 0) });
    });
  });
  var weeks = [];
  for (var i = 7; i >= 0; i--) {
    var monday = addDays(getMonday(todayISO()), -7 * i);
    var sunday = addDays(monday, 6);
    var total = allItems.filter(function (it) { return it.date >= monday && it.date <= sunday; }).reduce(function (s, it) { return s + it.km; }, 0);
    weeks.push({ label: '' + isoWeekNumber(monday), value: total });
  }
  if (!weeks.some(function (w) { return w.value > 0; })) return null;
  return e(Card, { className: 'p-4' },
    e('div', { className: 'text-sm font-semibold mb-3' }, 'Km per week (zwemmen + hardlopen + fietsen, laatste 8 weken)'),
    e(SimpleBarChart, { bars: weeks })
  );
}
export function Home(props) {
  var s = props.state;
  var todayEntries = s.scheduleEntries.filter(function (x) { return x.date === todayISO(); });
  var st3 = useState(null); var logEntry = st3[0], setLogEntry = st3[1];
  var st4 = useState(false); var addToday = st4[0], setAddToday = st4[1];
  var st5 = useState(false); var healthOpen = st5[0], setHealthOpen = st5[1];

  return e('div', { className: 'flex flex-col gap-5' },
    e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, WEEKDAYS_FULL[new Date().getDay()].charAt(0).toUpperCase() + WEEKDAYS_FULL[new Date().getDay()].slice(1) + ', ' + formatDateShort(todayISO())),
    e(GoalCountdown, { races: s.races, onOpen: function () { props.onOpenMarathon(); } }),
    e('div', {},
      e('div', { className: 'flex items-center justify-between mb-2' },
        e('span', { className: 'text-sm font-semibold' }, 'Vandaag op de planning'),
        todayEntries.length ? e('button', { onClick: function () { setAddToday(true); }, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, '+ extra training') : null
      ),
      todayEntries.length ? e('div', { className: 'flex flex-col gap-2' }, todayEntries.map(function (en) { return e(DayCard, { key: en.id, entry: en, onOpen: function () { setLogEntry(en); } }); })) :
        e(RestDayCard, { onAdd: function () { setAddToday(true); } })
    ),
    e(MoodTracker, { moodLogs: s.moodLogs, onSetMood: props.setMood }),
    e(HealthMini, { complaintLogs: s.complaintLogs, onOpen: function () { setHealthOpen(true); } }),
    e(Trends, { entries: s.scheduleEntries }),
    e(WeeklyVolumeChart, { state: s }),
    e('button', { onClick: function () { props.onOpenRecap(); }, className: 'text-xs font-medium text-center', style: { color: 'var(--slate)' } }, '📊 Jaaroverzicht bekijken'),
    healthOpen ? e(Modal, { title: 'Klachten & gewicht', onClose: function () { setHealthOpen(false); } },
      e(GezondheidTab, { state: s, addComplaint: props.addComplaint, deleteComplaint: props.deleteComplaint, saveBodyWeight: props.saveBodyWeight, deleteBodyWeight: props.deleteBodyWeight })) : null,
    logEntry ? e(LogTrainingModal, { entry: logEntry, onClose: function () { setLogEntry(null); },
      onSave: function (id, actual) { props.completeEntry(id, actual); setLogEntry(null); },
      onUncomplete: props.uncompleteEntry, onUpdateEntry: props.updateEntry, onDeleteEntry: props.deleteEntry, races: s.races, onAddRace: props.addRace, strengthLogs: s.strengthLogs, strengthTemplates: s.strengthTemplates, onSaveStrengthLog: props.addStrengthLog, hyroxLibrary: s.hyroxLibrary, onSaveHyroxLog: props.addHyroxLog }) : null,
    addToday ? e(AddScheduleEntryModal, { defaultDate: todayISO(), races: s.races, onAddRace: props.addRace, onClose: function () { setAddToday(false); }, onAdd: function (entry) { props.addEntry(entry); setAddToday(false); } }) : null
  );
}
