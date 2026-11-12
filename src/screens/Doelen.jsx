/* ---------------- Doelen-tab ----------------
   Bundelt alles rond je doelen en wedstrijden:
   - Marathon: overzicht van het marathonschema (zie Marathon.jsx).
   - Races: aankomende wedstrijden, wedstrijdgeschiedenis en de
     triatlon-checklist. De race-onderdelen hieronder stonden eerst op Home
     en zijn ongewijzigd hierheen verplaatst. RaceCard en RaceModal worden
     ook op Home gebruikt (lijst met aankomende races).
   - Prestaties: records (PRs) en het duursport-archief met hartslagzones. */
import React, { useState } from 'react';
import { Card, Badge, Button, Field, TextInput, Modal, ConfirmInline, KebabMenu, SegTabs } from '../components/ui.jsx';
import { uid, num, todayISO, daysBetween, formatDateShort, formatDateLong, formatDateWithYear } from '../lib/helpers.js';
import { SPORT_ICON } from '../lib/constants.js';
import { MarathonView } from './Marathon.jsx';
import { PRTab } from './PRs.jsx';
import { DuursportTab, TriathlonChecklistView } from './Duursport.jsx';
var e = React.createElement;

export function RaceCard(props) {
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
/* De doeltijd wordt bewaard in het veld result (jsonb) als goalTime, naast
   de echte eindtijd en evaluatie. Zo is er geen databasewijziging nodig. */
function RaceForm(props) {
  var base = props.initial || { name: '', date: '', type: '', targetPace: '', pacingNotes: '', carbNotes: '' };
  var init = Object.assign({}, base, { goalTime: (base.result && base.result.goalTime) || '' });
  var st = useState(init); var f = st[0], setF = st[1];
  function save() {
    if (!f.name || !f.date) return;
    var out = Object.assign({}, f);
    delete out.goalTime;
    out.result = Object.assign({}, base.result || {}, { goalTime: f.goalTime || null });
    props.onSave(out);
  }
  function set(k) { return function (ev) { var v = ev.target.value; setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }; }
  return e('div', { className: 'flex flex-col gap-3' },
    e(Field, { label: 'Naam' }, e(TextInput, { value: f.name, onChange: set('name'), placeholder: 'bv. Halve Marathon Malaga' })),
    e('div', { className: 'grid grid-cols-2 gap-3' },
      e(Field, { label: 'Datum' }, e(TextInput, { type: 'date', value: f.date, onChange: set('date') })),
      e(Field, { label: 'Type event' }, e(TextInput, { value: f.type, onChange: set('type'), placeholder: 'bv. halve marathon' }))
    ),
    e('div', { className: 'grid grid-cols-2 gap-3' },
      e(Field, { label: 'Doeltijd' }, e(TextInput, { value: f.goalTime, onChange: set('goalTime'), placeholder: 'bv. 3:45:00' })),
      e(Field, { label: 'Target pace' }, e(TextInput, { value: f.targetPace, onChange: set('targetPace'), placeholder: 'bv. 4:40/km' }))
    ),
    e(Field, { label: 'Pacing-schema (notities)' }, e('textarea', { rows: 3, value: f.pacingNotes, onChange: set('pacingNotes'), placeholder: 'Vrije notities over je pacing-aanpak' })),
    e(Field, { label: 'Overige notities (optioneel)' }, e('textarea', { rows: 3, value: f.carbNotes, onChange: set('carbNotes'), placeholder: 'bv. bietensapprotocol, hydratatie-tips — losse maaltijden voeg je toe in het wedstrijdscherm' })),
    e(Button, { onClick: save, className: 'w-full mt-1' }, props.saveLabel || 'Wedstrijd opslaan')
  );
}
export function RaceModal(props) {
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
      race.result && race.result.goalTime ? e(Badge, { tone: 'sage' }, 'doel: ' + race.result.goalTime) : null,
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
function RacesView(props) {
  var s = props.state;
  var upcomingRaces = s.races.filter(function (r) { return r.date >= todayISO(); }).sort(function (a, b) { return a.date.localeCompare(b.date); });
  var st2 = useState(false); var addRace = st2[0], setAddRace = st2[1];
  var st7 = useState(false); var raceHistoryOpen = st7[0], setRaceHistoryOpen = st7[1];
  var stCl = useState(false); var checklistOpen = stCl[0], setChecklistOpen = stCl[1];
  return e('div', { className: 'flex flex-col gap-5' },
    e('div', {},
      e('div', { className: 'flex items-center justify-between mb-2' },
        e('span', { className: 'text-sm font-semibold' }, 'Aankomende wedstrijden'),
        e('button', { onClick: function () { setAddRace(true); }, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, '+ Race toevoegen')
      ),
      upcomingRaces.length ? e('div', { className: 'flex flex-col gap-2' },
        upcomingRaces.map(function (r) { return e(RaceCard, { key: r.id, race: r,
          onOpen: function () { props.onOpenRace(r, false); },
          onEdit: function () { props.onOpenRace(r, true); },
          onDelete: function () { props.deleteRace(r.id); } }); })
      ) : e('p', { className: 'text-sm', style: { color: 'var(--text-tertiary)' } }, 'Geen aankomende wedstrijden.'),
      e('button', { onClick: function () { setRaceHistoryOpen(true); }, className: 'text-xs font-medium mt-2', style: { color: 'var(--slate)' } }, '📜 Wedstrijdgeschiedenis bekijken')
    ),
    e(Card, { className: 'p-4' },
      e('button', { onClick: function () { setChecklistOpen(!checklistOpen); }, className: 'w-full flex items-center justify-between' },
        e('span', { className: 'text-sm font-semibold' }, 'Triatlon-checklist'),
        e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, checklistOpen ? 'verbergen ▾' : 'tonen ▸')
      ),
      checklistOpen ? e('div', { className: 'mt-3' },
        e(TriathlonChecklistView, { checklist: s.triathlonChecklist, onToggle: props.toggleChecklistItem, onRemove: props.removeChecklistItem, onAdd: props.addChecklistItem, onReset: props.resetChecklist })
      ) : null
    ),
    raceHistoryOpen ? e(RaceHistoryModal, { races: s.races, onClose: function () { setRaceHistoryOpen(false); },
      onOpenRace: function (r) { setRaceHistoryOpen(false); props.onOpenRace(r, false); } }) : null,
    addRace ? e(Modal, { title: 'Race toevoegen', onClose: function () { setAddRace(false); } },
      e(RaceForm, { onSave: function (f) { props.addRace(Object.assign({ id: uid(), pacingScenarios: null, mealPlan: { days: [] }, result: null }, f)); setAddRace(false); } })) : null
  );
}

export function DoelenTab(props) {
  var s = props.state;
  var view = props.view || 'marathon';
  var st = useState(null); var raceModalId = st[0], setRaceModalId = st[1];
  var stEdit = useState(false); var raceEditMode = stEdit[0], setRaceEditMode = stEdit[1];
  var raceModal = raceModalId ? s.races.find(function (r) { return r.id === raceModalId; }) : null;
  function openRace(r, edit) { setRaceModalId(r.id); setRaceEditMode(!!edit); }
  return e('div', { className: 'flex flex-col gap-4' },
    e('h2', { className: 'font-display text-xl font-semibold text-center' }, 'Doelen'),
    e(SegTabs, { value: view, onChange: props.setView, options: [{ value: 'marathon', label: 'Marathon' }, { value: 'races', label: 'Races' }, { value: 'prestaties', label: 'Prestaties' }] }),
    view === 'marathon' ? e(MarathonView, { state: s, onOpenRace: function (r) { openRace(r, false); },
      completeEntry: props.completeEntry, uncompleteEntry: props.uncompleteEntry, updateEntry: props.updateEntry, deleteEntry: props.deleteEntry,
      addRace: props.addRace, addStrengthLog: props.addStrengthLog, addHyroxLog: props.addHyroxLog }) : null,
    view === 'races' ? e(RacesView, { state: s, onOpenRace: openRace, addRace: props.addRace, deleteRace: props.deleteRace,
      toggleChecklistItem: props.toggleChecklistItem, addChecklistItem: props.addChecklistItem, removeChecklistItem: props.removeChecklistItem, resetChecklist: props.resetChecklist }) : null,
    view === 'prestaties' ? e('div', { className: 'flex flex-col gap-8' },
      e(PRTab, { state: s, addHyroxRaceResult: props.addHyroxRaceResult, addRunRaceResult: props.addRunRaceResult, updateRunRaceResult: props.updateRunRaceResult, deleteRunRaceResult: props.deleteRunRaceResult, updateHyroxRaceResult: props.updateHyroxRaceResult, deleteHyroxRaceResult: props.deleteHyroxRaceResult, seedMyPRs: props.seedMyPRs }),
      e(DuursportTab, { state: s, hideTriathlon: true, addEnduranceLog: props.addEnduranceLog, deleteEntry: props.deleteEntry, deleteEnduranceLog: props.deleteEnduranceLog })
    ) : null,
    raceModal ? e(RaceModal, { key: raceModal.id + (raceEditMode ? '-edit' : ''), race: raceModal, startEditing: raceEditMode, scheduleEntries: s.scheduleEntries,
      onClose: function () { setRaceModalId(null); setRaceEditMode(false); },
      onUpdate: function (r) { props.updateRace(r); }, onDelete: props.deleteRace }) : null
  );
}
