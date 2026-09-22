/* ---------------- Home-tab ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html. */
import React, { useState } from 'react';
import { Card, Badge, Button, Field, TextInput, Modal, ConfirmInline, KebabMenu } from '../components/ui.jsx';
import { SimpleBarChart } from '../components/charts.jsx';
import { DayCard, RestDayCard, LogTrainingModal, AddScheduleEntryModal } from '../components/scheduling.jsx';
import { enduranceArchiveItems, consecutiveTrainingDaysEndingToday, generateInsights } from '../lib/domain.js';
import { uid, num, todayISO, daysBetween, addDays, getMonday, isoWeekNumber, formatDateShort, formatDateLong, formatDateWithYear, toDate, WEEKDAYS_FULL } from '../lib/helpers.js';
import { SPORT_ICON } from '../lib/constants.js';
var e = React.createElement;

function RaceCard(props) {
  var race = props.race;
  var d = daysBetween(todayISO(), race.date);
  var label = d > 0 ? d + ' dagen' : (d === 0 ? 'Vandaag!' : 'Geweest');
  return e(Card, { onClick: props.onOpen, className: 'p-3.5 flex items-center justify-between gap-2 cursor-pointer' },
    e('div', { className: 'min-w-0 flex-1' },
      e('div', { className: 'text-sm font-semibold truncate' }, race.name),
      e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, (race.type || 'wedstrijd') + ' · ' + formatDateShort(race.date))
    ),
    e('div', { className: 'flex items-center gap-1 shrink-0' },
      e(Badge, { tone: 'slate' }, label),
      e(KebabMenu, { actions: [
        { label: 'Bewerken', onClick: props.onEdit },
        { label: 'Verwijderen', danger: true, confirm: true, onClick: props.onDelete }
      ] })
    )
  );
}
function ScenarioTable(props) {
  return e('div', { className: 'mb-4' },
    e('div', { className: 'text-sm font-semibold mb-2' }, props.scenario.label),
    e('div', { className: 'overflow-x-auto scrollbar-none rounded-xl', style: { border: '1px solid var(--border-soft)' } },
      e('table', { className: 'w-full text-xs' },
        e('thead', {}, e('tr', { style: { background: 'var(--bg-elevated)' } },
          ['Afstand', 'Tempo', 'HR-doel', 'Tijd', 'Gel'].map(function (h) { return e('th', { key: h, className: 'text-left px-2.5 py-2 font-medium', style: { color: 'var(--text-secondary)' } }, h); })
        )),
        e('tbody', {}, props.scenario.rows.map(function (r, i) {
          return e('tr', { key: i, style: { borderTop: '1px solid var(--border-soft)' } },
            r.map(function (c, j) { return e('td', { key: j, className: 'px-2.5 py-2 whitespace-nowrap' }, c || '—'); })
          );
        }))
      )
    )
  );
}
function MealRow(props) {
  var m = props.meal;
  function set(k) { return function (ev) { var patch = {}; patch[k] = ev.target.value; props.onChange(Object.assign({}, m, patch)); }; }
  return e(Card, { className: 'p-3 flex flex-col gap-2' },
    e('div', { className: 'flex items-start gap-2' },
      e('div', { className: 'grid grid-cols-2 gap-2 flex-1' },
        e(TextInput, { placeholder: 'tijd, bv. 8:00', value: m.time, onChange: set('time') }),
        e(TextInput, { placeholder: 'maaltijd, bv. Ontbijt', value: m.name, onChange: set('name') })
      ),
      e('button', { onClick: props.onRemove, className: 'text-xs shrink-0 pt-2', style: { color: 'var(--danger)' } }, '✕')
    ),
    e(TextInput, { placeholder: 'product & hoeveelheid', value: m.product, onChange: set('product') }),
    e('div', { className: 'grid grid-cols-2 gap-2' },
      e(TextInput, { type: 'number', placeholder: 'carbs (g)', value: m.carbs, onChange: set('carbs') }),
      e(TextInput, { type: 'number', placeholder: 'kcal', value: m.kcal, onChange: set('kcal') })
    )
  );
}
function MealDayCard(props) {
  var day = props.day;
  function updateMeal(updated) { props.onChangeDay(Object.assign({}, day, { meals: day.meals.map(function (m) { return m.id === updated.id ? updated : m; }) })); }
  function addMeal() { props.onChangeDay(Object.assign({}, day, { meals: day.meals.concat([{ id: uid(), time: '', name: '', product: '', carbs: '', kcal: '' }]) })); }
  function removeMeal(id) { props.onChangeDay(Object.assign({}, day, { meals: day.meals.filter(function (m) { return m.id !== id; }) })); }
  function updateTitle(v) { props.onChangeDay(Object.assign({}, day, { title: v })); }
  var totalCarbs = day.meals.reduce(function (s, m) { return s + (num(m.carbs) || 0); }, 0);
  var totalKcal = day.meals.reduce(function (s, m) { return s + (num(m.kcal) || 0); }, 0);
  return e('div', { className: 'flex flex-col gap-2 mb-5' },
    e('div', { className: 'flex items-center gap-2' },
      e(TextInput, { value: day.title, onChange: function (ev) { updateTitle(ev.target.value); }, placeholder: 'Naam dag, bv. Zaterdag 26 september', className: 'flex-1' }),
      e(ConfirmInline, { label: 'Dag verwijderen', onConfirm: props.onRemoveDay })
    ),
    day.meals.map(function (m) { return e(MealRow, { key: m.id, meal: m, onChange: updateMeal, onRemove: function () { removeMeal(m.id); } }); }),
    e('button', { onClick: addMeal, className: 'text-xs font-medium text-left', style: { color: 'var(--slate)' } }, '+ Maaltijd toevoegen'),
    day.meals.length ? e('div', { className: 'flex justify-between text-xs font-semibold px-1 pt-1', style: { color: 'var(--sage-strong)' } },
      e('span', {}, 'Totaal'),
      e('span', {}, totalCarbs.toFixed(1).replace('.', ',') + 'g carbs · ' + Math.round(totalKcal) + ' kcal')
    ) : null
  );
}
function RaceForm(props) {
  var init = props.initial || { name: '', date: '', type: '', targetPace: '', pacingNotes: '', carbNotes: '' };
  var st = useState(init); var f = st[0], setF = st[1];
  function set(k) { return function (ev) { var v = ev.target.value; setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }; }
  return e('div', { className: 'flex flex-col gap-3' },
    e(Field, { label: 'Naam' }, e(TextInput, { value: f.name, onChange: set('name'), placeholder: 'bv. Halve Marathon Malaga' })),
    e('div', { className: 'grid grid-cols-2 gap-3' },
      e(Field, { label: 'Datum' }, e(TextInput, { type: 'date', value: f.date, onChange: set('date') })),
      e(Field, { label: 'Type event' }, e(TextInput, { value: f.type, onChange: set('type'), placeholder: 'bv. halve marathon' }))
    ),
    e(Field, { label: 'Target pace' }, e(TextInput, { value: f.targetPace, onChange: set('targetPace'), placeholder: 'bv. 4:40/km' })),
    e(Field, { label: 'Pacing-schema (notities)' }, e('textarea', { rows: 3, value: f.pacingNotes, onChange: set('pacingNotes'), placeholder: 'Vrije notities over je pacing-aanpak' })),
    e(Field, { label: 'Overige notities (optioneel)' }, e('textarea', { rows: 3, value: f.carbNotes, onChange: set('carbNotes'), placeholder: 'bv. bietensapprotocol, hydratatie-tips — losse maaltijden voeg je toe in het wedstrijdscherm' })),
    e(Button, { onClick: function () { if (!f.name || !f.date) return; props.onSave(f); }, className: 'w-full mt-1' }, props.saveLabel || 'Wedstrijd opslaan')
  );
}
function RaceModal(props) {
  var st = useState(props.startEditing || false); var editing = st[0], setEditing = st[1];
  var race = props.race;
  if (editing) {
    return e(Modal, { title: 'Wedstrijd bewerken', onClose: props.onClose },
      e(RaceForm, { initial: race, saveLabel: 'Wijzigingen opslaan', onSave: function (f) { props.onUpdate(Object.assign({}, race, f)); setEditing(false); } })
    );
  }
  var mealDays = (race.mealPlan && race.mealPlan.days) || [];
  function setMealDays(newDays) { props.onUpdate(Object.assign({}, race, { mealPlan: { days: newDays } })); }
  function changeDay(dayId, updatedDay) { setMealDays(mealDays.map(function (d) { return d.id === dayId ? updatedDay : d; })); }
  function removeDay(dayId) { setMealDays(mealDays.filter(function (d) { return d.id !== dayId; })); }
  function addDay() { setMealDays(mealDays.concat([{ id: uid(), title: '', meals: [] }])); }
  var grandCarbs = mealDays.reduce(function (s, d) { return s + d.meals.reduce(function (s2, m) { return s2 + (num(m.carbs) || 0); }, 0); }, 0);
  var grandKcal = mealDays.reduce(function (s, d) { return s + d.meals.reduce(function (s2, m) { return s2 + (num(m.kcal) || 0); }, 0); }, 0);
  var linkedEntries = (props.scheduleEntries || []).filter(function (x) { return x.date === race.date; });
  var result = race.result || {};
  function setResult(patch) { props.onUpdate(Object.assign({}, race, { result: Object.assign({}, result, patch) })); }
  return e(Modal, { title: race.name, onClose: props.onClose },
    e('div', { className: 'flex items-center gap-2 mb-4 flex-wrap' },
      e(Badge, { tone: 'slate' }, race.type || 'wedstrijd'),
      e(Badge, { tone: 'amber' }, formatDateLong(race.date)),
      race.targetPace ? e(Badge, { tone: 'sage' }, 'target: ' + race.targetPace) : null
    ),
    linkedEntries.length ? e('div', { className: 'mb-4' },
      e('div', { className: 'text-sm font-semibold mb-1.5' }, 'Vanuit trainingsschema deze dag'),
      e('div', { className: 'flex flex-col gap-2' },
        linkedEntries.map(function (en) {
          var a = en.actual || {};
          var line = en.completed ? [
            a.distance != null ? a.distance + ' km' : null,
            a.time || null,
            a.pace ? a.pace + '/km' : null,
            a.hr != null ? a.hr + ' bpm' : null
          ].filter(Boolean).join(' · ') || 'afgevinkt' : 'nog niet afgevinkt';
          return e(Card, { key: en.id, className: 'p-3 flex items-center gap-2' },
            e('span', {}, SPORT_ICON[en.sport] || '•'),
            e('div', { className: 'flex-1' }, e('div', { className: 'text-sm font-medium' }, en.type), e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, line))
          );
        })
      )
    ) : null,
    race.pacingScenarios ? race.pacingScenarios.map(function (sc, i) { return e(ScenarioTable, { key: i, scenario: sc }); }) :
      (race.pacingNotes ? e('div', { className: 'mb-4' }, e('div', { className: 'text-sm font-semibold mb-1.5' }, 'Pacing-schema'), e('p', { className: 'text-sm whitespace-pre-wrap', style: { color: 'var(--text-secondary)' } }, race.pacingNotes)) :
      e('p', { className: 'text-sm mb-4', style: { color: 'var(--text-tertiary)' } }, 'Nog geen pacing-schema toegevoegd.')),
    e('div', { className: 'mb-2' },
      e('div', { className: 'flex items-center justify-between mb-2' },
        e('div', { className: 'text-sm font-semibold' }, 'Maaltijden & carbload'),
        mealDays.length ? e(Badge, { tone: 'sage' }, grandCarbs.toFixed(1).replace('.', ',') + 'g · ' + Math.round(grandKcal) + ' kcal totaal') : null
      ),
      mealDays.map(function (day) {
        return e(MealDayCard, { key: day.id, day: day, onChangeDay: function (updated) { changeDay(day.id, updated); }, onRemoveDay: function () { removeDay(day.id); } });
      }),
      e('button', { onClick: addDay, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, '+ Dag toevoegen')
    ),
    race.carbNotes ? e('div', { className: 'mb-4 mt-2' }, e('div', { className: 'text-sm font-semibold mb-1.5' }, 'Overige notities'), e('p', { className: 'text-sm whitespace-pre-wrap', style: { color: 'var(--text-secondary)' } }, race.carbNotes)) : null,
    e('div', { className: 'mb-2' },
      e('div', { className: 'text-sm font-semibold mb-1.5' }, 'Hoe ging het?'),
      e('div', { className: 'flex flex-col gap-2' },
        e(TextInput, { placeholder: 'Officiele eindtijd (optioneel)', value: result.time || '', onChange: function (ev) { setResult({ time: ev.target.value }); } }),
        e('textarea', { rows: 3, placeholder: 'Evaluatie — hoe voelde het, wat ging goed, wat volgende keer anders?', value: result.note || '', onChange: function (ev) { setResult({ note: ev.target.value }); } })
      )
    ),
    e('div', { className: 'flex gap-2 mt-2' },
      e(Button, { variant: 'ghost', onClick: function () { setEditing(true); } }, 'Bewerken'),
      e(ConfirmInline, { onConfirm: function () { props.onDelete(race.id); props.onClose(); } })
    )
  );
}
function TrainingLoadWarning(props) {
  var streak = consecutiveTrainingDaysEndingToday(props.entries);
  if (streak < 5) return null;
  return e(Card, { className: 'p-4', style: { background: 'var(--amber-bg)', border: '1px solid var(--amber)' } },
    e('div', { className: 'text-sm font-semibold', style: { color: 'var(--amber)' } }, '⚠️ ' + streak + ' dagen op rij getraind'),
    e('div', { className: 'text-xs mt-1', style: { color: 'var(--text-secondary)' } }, 'Overweeg een rustdag in te plannen om overbelasting te voorkomen.')
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
  var current = props.moodLogs.find(function (m) { return m.date === todayISO(); });
  var options = [
    { key: 'green', emoji: '🟢', bg: 'var(--sage-bg)', border: 'var(--sage)' },
    { key: 'orange', emoji: '🟠', bg: 'var(--amber-bg)', border: 'var(--amber)' },
    { key: 'red', emoji: '🔴', bg: 'var(--danger-bg)', border: 'var(--danger)' }
  ];
  var colorMap = { green: 'var(--sage)', orange: 'var(--amber)', red: 'var(--danger)' };
  var byDate = {}; props.moodLogs.forEach(function (m) { byDate[m.date] = m.mood; });
  var last7 = [6, 5, 4, 3, 2, 1, 0].map(function (i) { return addDays(todayISO(), -i); });
  return e(Card, { className: 'p-4' },
    e('div', { className: 'text-sm font-semibold mb-3' }, 'Hoe voel ik mij vandaag?'),
    e('div', { className: 'flex gap-2' }, options.map(function (o) {
      var active = current && current.mood === o.key;
      return e('button', { key: o.key, onClick: function () { props.onSetMood(o.key); }, className: 'flex-1 rounded-xl py-3 flex items-center justify-center text-2xl',
        style: { background: active ? o.bg : 'var(--bg-inset)', border: active ? ('1.5px solid ' + o.border) : '1px solid var(--border)' } }, o.emoji);
    })),
    e('div', { className: 'flex justify-between gap-1 mt-3' }, last7.map(function (d) {
      var mood = byDate[d];
      return e('div', { key: d, className: 'flex flex-col items-center gap-1 flex-1' },
        e('div', { className: 'w-full h-2 rounded-full', style: { background: mood ? colorMap[mood] : 'var(--bg-inset)' } }),
        e('span', { className: 'text-[10px]', style: { color: 'var(--text-tertiary)' } }, WEEKDAYS_FULL[toDate(d).getDay()].slice(0, 2))
      );
    }))
  );
}
function RaceHistoryModal(props) {
  var past = props.races.filter(function (r) { return r.date < todayISO(); }).sort(function (a, b) { return b.date.localeCompare(a.date); });
  return e(Modal, { title: 'Wedstrijdgeschiedenis', onClose: props.onClose },
    past.length ? e('div', { className: 'flex flex-col gap-2' }, past.map(function (r) {
      var res = r.result || {};
      return e(Card, { key: r.id, className: 'p-3.5 cursor-pointer', onClick: function () { props.onOpenRace(r); } },
        e('div', { className: 'flex items-center justify-between mb-1' },
          e('div', {}, e('div', { className: 'text-sm font-semibold' }, r.name), e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, (r.type || 'wedstrijd') + ' · ' + formatDateWithYear(r.date))),
          res.time ? e(Badge, { tone: 'amber' }, res.time) : null
        ),
        res.note ? e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, res.note.length > 90 ? res.note.slice(0, 90) + '…' : res.note) : e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Nog geen evaluatie ingevuld')
      );
    })) : e('p', { className: 'text-sm', style: { color: 'var(--text-tertiary)' } }, 'Nog geen afgelopen wedstrijden.')
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
function InsightsWidget(props) {
  var insights = generateInsights(props.state);
  if (!insights.length) return null;
  return e(Card, { className: 'p-4' },
    e('div', { className: 'text-sm font-semibold mb-2' }, '💡 Inzichten'),
    e('div', { className: 'flex flex-col gap-2' }, insights.map(function (t, i) {
      return e('p', { key: i, className: 'text-sm', style: { color: 'var(--text-secondary)' } }, t);
    }))
  );
}

export function Home(props) {
  var s = props.state;
  var todayEntries = s.scheduleEntries.filter(function (x) { return x.date === todayISO(); });
  var st = useState(null); var raceModal = st[0], setRaceModal = st[1];
  var stEdit = useState(false); var raceEditMode = stEdit[0], setRaceEditMode = stEdit[1];
  var st2 = useState(false); var addRace = st2[0], setAddRace = st2[1];
  var st3 = useState(null); var logEntry = st3[0], setLogEntry = st3[1];
  var st4 = useState(false); var addToday = st4[0], setAddToday = st4[1];
  var st7 = useState(false); var raceHistoryOpen = st7[0], setRaceHistoryOpen = st7[1];

  return e('div', { className: 'flex flex-col gap-5' },
    e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, WEEKDAYS_FULL[new Date().getDay()].charAt(0).toUpperCase() + WEEKDAYS_FULL[new Date().getDay()].slice(1) + ', ' + formatDateShort(todayISO())),
    e('div', {},
      e('div', { className: 'flex items-center justify-between mb-2' },
        e('span', { className: 'text-sm font-semibold' }, 'Wedstrijden'),
        e('button', { onClick: function () { setAddRace(true); }, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, '+ Race toevoegen')
      ),
      e('div', { className: 'flex flex-col gap-2' },
        s.races.map(function (r) { return e(RaceCard, { key: r.id, race: r,
          onOpen: function () { setRaceModal(r); setRaceEditMode(false); },
          onEdit: function () { setRaceModal(r); setRaceEditMode(true); },
          onDelete: function () { props.deleteRace(r.id); } }); })
      ),
      e('button', { onClick: function () { setRaceHistoryOpen(true); }, className: 'text-xs font-medium mt-2', style: { color: 'var(--slate)' } }, '📜 Wedstrijdgeschiedenis bekijken')
    ),
    e('div', {},
      e('div', { className: 'flex items-center justify-between mb-2' },
        e('span', { className: 'text-sm font-semibold' }, 'Vandaag op de planning'),
        todayEntries.length ? e('button', { onClick: function () { setAddToday(true); }, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, '+ extra training') : null
      ),
      todayEntries.length ? e('div', { className: 'flex flex-col gap-2' }, todayEntries.map(function (en) { return e(DayCard, { key: en.id, entry: en, onOpen: function () { setLogEntry(en); } }); })) :
        e(RestDayCard, { onAdd: function () { setAddToday(true); } })
    ),
    e(TrainingLoadWarning, { entries: s.scheduleEntries }),
    e(MoodTracker, { moodLogs: s.moodLogs, onSetMood: props.setMood }),
    e(Trends, { entries: s.scheduleEntries }),
    e(WeeklyVolumeChart, { state: s }),
    e('button', { onClick: function () { props.onOpenRecap(); }, className: 'text-xs font-medium text-center', style: { color: 'var(--slate)' } }, '📊 Jaaroverzicht bekijken'),
    e(InsightsWidget, { state: s }),
    raceModal ? e(RaceModal, { race: raceModal, startEditing: raceEditMode, scheduleEntries: s.scheduleEntries, onClose: function () { setRaceModal(null); setRaceEditMode(false); },
      onUpdate: function (r) { props.updateRace(r); setRaceModal(r); }, onDelete: props.deleteRace }) : null,
    raceHistoryOpen ? e(RaceHistoryModal, { races: s.races, onClose: function () { setRaceHistoryOpen(false); },
      onOpenRace: function (r) { setRaceHistoryOpen(false); setRaceModal(r); setRaceEditMode(false); } }) : null,
    addRace ? e(Modal, { title: 'Race toevoegen', onClose: function () { setAddRace(false); } },
      e(RaceForm, { onSave: function (f) { props.addRace(Object.assign({ id: uid(), pacingScenarios: null, mealPlan: { days: [] }, result: null }, f)); setAddRace(false); } })) : null,
    logEntry ? e(LogTrainingModal, { entry: logEntry, onClose: function () { setLogEntry(null); },
      onSave: function (id, actual) { props.completeEntry(id, actual); setLogEntry(null); },
      onUncomplete: props.uncompleteEntry, onUpdateEntry: props.updateEntry, onDeleteEntry: props.deleteEntry, strengthLogs: s.strengthLogs, strengthTemplates: s.strengthTemplates, onSaveStrengthLog: props.addStrengthLog, hyroxLibrary: s.hyroxLibrary, onSaveHyroxLog: props.addHyroxLog }) : null,
    addToday ? e(AddScheduleEntryModal, { defaultDate: todayISO(), onClose: function () { setAddToday(false); }, onAdd: function (entry) { props.addEntry(entry); setAddToday(false); } }) : null
  );
}
