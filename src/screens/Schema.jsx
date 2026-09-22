/* ---------------- Schema-tab ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html. */
import React, { useState } from 'react';
import { SegTabs } from '../components/ui.jsx';
import { WeekBlock, AddScheduleEntryModal } from '../components/scheduling.jsx';
import { LogTrainingModal } from '../components/scheduling.jsx';
import { uid, getMonday, todayISO, addDays, addMonthsToMonthKey, monthKeyOf, monthLabel, formatDateShort, isoWeekNumber } from '../lib/helpers.js';
var e = React.createElement;

export function SchemaTab(props) {
  var stV = useState('week'); var view = stV[0], setView = stV[1];
  var stMonday = useState(getMonday(todayISO())); var monday = stMonday[0], setMonday = stMonday[1];
  var stMk = useState(monthKeyOf(todayISO())); var mk = stMk[0], setMk = stMk[1];
  var st2 = useState(null); var openEntry = st2[0], setOpenEntry = st2[1];
  var st3 = useState(null); var addFor = st3[0], setAddFor = st3[1];

  function labelFor(m) {
    return 'Week ' + isoWeekNumber(m);
  }
  function copyWeek(sourceMonday) {
    var sourceEntries = props.state.scheduleEntries.filter(function (x) { return x.date >= sourceMonday && x.date <= addDays(sourceMonday, 6); });
    sourceEntries.forEach(function (x) {
      props.addEntry({ id: uid(), date: addDays(x.date, 7), weekLabel: '', sport: x.sport, type: x.type, plannedText: x.plannedText, distance: x.distance, pace: x.pace, hr: null, completed: false, actual: null });
    });
  }
  var monthMondays = [];
  if (view === 'month') {
    var lastOfMonth = addDays(addMonthsToMonthKey(mk, 1) + '-01', -1);
    var cursor = getMonday(mk + '-01');
    while (cursor <= lastOfMonth) { monthMondays.push(cursor); cursor = addDays(cursor, 7); }
  }
  return e('div', { className: 'flex flex-col gap-4' },
    e('h2', { className: 'font-display text-xl font-semibold text-center' }, 'Trainingsschema'),
    e(SegTabs, { value: view, onChange: setView, options: [{ value: 'week', label: 'Week' }, { value: 'month', label: 'Maand' }] }),
    view === 'week' ? e('div', { className: 'flex items-center justify-between' },
      e('button', { onClick: function () { setMonday(addDays(monday, -7)); }, className: 'w-8 h-8 rounded-full', style: { background: 'var(--bg-elevated)' } }, '←'),
      e('div', { className: 'text-sm font-semibold' }, labelFor(monday)),
      e('button', { onClick: function () { setMonday(addDays(monday, 7)); }, className: 'w-8 h-8 rounded-full', style: { background: 'var(--bg-elevated)' } }, '→')
    ) : e('div', { className: 'flex items-center justify-between' },
      e('button', { onClick: function () { setMk(addMonthsToMonthKey(mk, -1)); }, className: 'w-8 h-8 rounded-full', style: { background: 'var(--bg-elevated)' } }, '←'),
      e('div', { className: 'text-sm font-semibold capitalize' }, monthLabel(mk)),
      e('button', { onClick: function () { setMk(addMonthsToMonthKey(mk, 1)); }, className: 'w-8 h-8 rounded-full', style: { background: 'var(--bg-elevated)' } }, '→')
    ),
    view === 'week' ? e('button', { onClick: function () { copyWeek(monday); }, className: 'text-xs font-medium text-center', style: { color: 'var(--slate)' } }, '📄 Kopieer deze week naar volgende week') : null,
    view === 'week' ? e(WeekBlock, { monday: monday, weekLabel: labelFor(monday), entries: props.state.scheduleEntries, onOpenEntry: setOpenEntry, onAddFor: setAddFor }) :
      monthMondays.map(function (m) { return e(WeekBlock, { key: m, monday: m, weekLabel: labelFor(m), entries: props.state.scheduleEntries, onOpenEntry: setOpenEntry, onAddFor: setAddFor }); }),
    openEntry ? e(LogTrainingModal, { entry: openEntry, onClose: function () { setOpenEntry(null); },
      onSave: function (id, actual) { props.completeEntry(id, actual); setOpenEntry(null); }, onUncomplete: props.uncompleteEntry, onUpdateEntry: props.updateEntry, onDeleteEntry: props.deleteEntry, strengthLogs: props.state.strengthLogs, strengthTemplates: props.state.strengthTemplates, onSaveStrengthLog: props.addStrengthLog, hyroxLibrary: props.state.hyroxLibrary, onSaveHyroxLog: props.addHyroxLog }) : null,
    addFor ? e(AddScheduleEntryModal, { defaultDate: addFor, onClose: function () { setAddFor(null); }, onAdd: function (entry) { props.addEntry(entry); setAddFor(null); } }) : null
  );
}
