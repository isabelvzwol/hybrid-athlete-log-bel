/* ---------------- gedeelde kracht-onderdelen ----------------
   ExerciseRow/StrengthChartModal worden zowel in de Kracht-tab als in de
   trainingslog-modal (Schema/Home) gebruikt - daarom in een gedeelde module,
   verder 1-op-1 overgenomen. */
import React, { useState, useEffect, useRef } from 'react';
import { Card, Modal, TextInput } from './ui.jsx';
import { SimpleLineChart } from './charts.jsx';
import { formatDateShort, formatDuration } from '../lib/helpers.js';
var e = React.createElement;

export function strengthLastLog(strengthLogs, name) {
  var logs = strengthLogs.filter(function (l) { return l.exercises.some(function (x) { return x.name === name; }); });
  if (!logs.length) return null;
  logs.sort(function (a, b) { return b.date.localeCompare(a.date); });
  var ex = logs[0].exercises.find(function (x) { return x.name === name; });
  if (!ex || !ex.sets.length) return null;
  var txt = ex.sets.map(function (s) { return s.reps + 'x' + s.weight + 'kg'; }).join(', ') + ' · ' + formatDateShort(logs[0].date);
  if (ex.note) txt += ' · “' + ex.note + '”';
  return txt;
}

/* Geeft de sets (reps/gewicht) van de laatste keer dat deze oefening gelogd
   werd terug als invulbare waarden, zodat de inputvelden er automatisch mee
   gevuld kunnen worden (in plaats van dat je alleen de tekst "vorige: ..."
   erboven ziet staan). */
export function strengthLastSets(strengthLogs, name) {
  var logs = strengthLogs.filter(function (l) { return l.exercises.some(function (x) { return x.name === name; }); });
  if (!logs.length) return null;
  logs.sort(function (a, b) { return b.date.localeCompare(a.date); });
  var ex = logs[0].exercises.find(function (x) { return x.name === name; });
  if (!ex || !ex.sets.length) return null;
  return ex.sets.map(function (s) { return { reps: s.reps != null ? '' + s.reps : '', weight: s.weight != null ? '' + s.weight : '' }; });
}

/* Groepeert een lijst oefeningen ({name, linkToNext}) in supersets: elke
   opeenvolgende reeks waarbij linkToNext=true wordt één groep, zodat die
   samen (als "Superset") getoond kunnen worden. */
export function groupBySuperset(list) {
  var groups = [];
  var i = 0;
  while (i < list.length) {
    var group = [list[i]];
    while (list[i].linkToNext && i + 1 < list.length) { i++; group.push(list[i]); }
    groups.push(group);
    i++;
  }
  return groups;
}

export function ExerciseRow(props) {
  var ex = props.exercise;
  var last = props.lastLog;
  var st = useState(props.sets || [{ reps: '', weight: '' }]); var sets = st[0], setSets = st[1];
  var stN = useState(''); var note = stN[0], setNote = stN[1];
  useEffect(function () { props.onChange(ex, { sets: sets, note: note }); }, [sets, note]);
  function updateSet(i, k, v) { setSets(function (p) { var n = p.slice(); n[i] = Object.assign({}, n[i]); n[i][k] = v; return n; }); }
  function removeSet(i) { setSets(function (p) { if (p.length <= 1) return p; return p.filter(function (_, j) { return j !== i; }); }); }

  var stDuration = useState(180); var restDuration = stDuration[0], setRestDuration = stDuration[1];
  var stRemaining = useState(0); var remaining = stRemaining[0], setRemaining = stRemaining[1];
  var stRunning = useState(false); var timerRunning = stRunning[0], setTimerRunning = stRunning[1];
  var intervalRef = useRef(null);
  var prevCompleteRef = useRef(0);
  function clearTimerInterval() { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }
  function startRestTimer() {
    clearTimerInterval();
    setRemaining(restDuration);
    setTimerRunning(true);
    intervalRef.current = setInterval(function () {
      setRemaining(function (r) {
        if (r <= 1) {
          clearTimerInterval(); setTimerRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }
  useEffect(function () {
    var completeCount = sets.filter(function (s) { return s.reps !== '' && s.weight !== ''; }).length;
    if (completeCount > prevCompleteRef.current) startRestTimer();
    prevCompleteRef.current = completeCount;
  }, [sets]);
  useEffect(function () { return function () { clearTimerInterval(); }; }, []);

  return e(Card, { className: 'p-3.5' },
    e('div', { className: 'flex items-center justify-between mb-2' },
      e('span', { className: 'text-sm font-semibold' }, ex),
      e('div', { className: 'flex items-center gap-2' },
        last ? e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'vorige: ' + last) : null,
        props.onShowChart ? e('button', { onClick: props.onShowChart, className: 'text-sm', style: { color: 'var(--slate)' } }, '📈') : null,
        props.onToggleLink ? e('button', { onClick: props.onToggleLink, title: 'Superset met volgende oefening', className: 'text-sm', style: { color: props.linked ? 'var(--amber)' : 'var(--slate)' } }, '🔗') : null,
        props.onMoveUp ? e('button', { onClick: props.onMoveUp, className: 'text-sm', style: { color: 'var(--slate)' } }, '▲') : null,
        props.onMoveDown ? e('button', { onClick: props.onMoveDown, className: 'text-sm', style: { color: 'var(--slate)' } }, '▼') : null,
        props.onRemove ? e('button', { onClick: props.onRemove, className: 'text-xs', style: { color: 'var(--danger)' } }, '✕') : null
      )
    ),
    e('div', { className: 'flex flex-col gap-2' },
      sets.map(function (s, i) {
        return e('div', { key: i, className: 'flex gap-2 items-center' },
          e('span', { className: 'text-xs w-4', style: { color: 'var(--text-tertiary)' } }, i + 1),
          e(TextInput, { type: 'number', placeholder: 'reps', value: s.reps, onChange: function (ev) { updateSet(i, 'reps', ev.target.value); } }),
          e(TextInput, { type: 'number', placeholder: 'kg', value: s.weight, onChange: function (ev) { updateSet(i, 'weight', ev.target.value); } }),
          sets.length > 1 ? e('button', { onClick: function () { removeSet(i); }, className: 'text-xs shrink-0', style: { color: 'var(--danger)' } }, '✕') : null
        );
      }),
      e('button', { onClick: function () { setSets(function (p) { return p.concat([{ reps: '', weight: '' }]); }); }, className: 'text-xs font-medium text-left', style: { color: 'var(--slate)' } }, '+ set toevoegen'),
      e('div', { className: 'flex items-center gap-2 rounded-xl px-2.5 py-2', style: { background: timerRunning ? 'var(--amber-bg)' : 'var(--bg-inset)' } },
        e('span', { className: 'font-display text-sm font-semibold w-10', style: { color: timerRunning ? 'var(--amber)' : 'var(--text-tertiary)' } }, formatDuration(remaining || restDuration)),
        e('span', { className: 'text-xs flex-1', style: { color: 'var(--text-tertiary)' } }, timerRunning ? 'rust…' : 'rusttimer'),
        [60, 90, 120, 180].map(function (d) {
          return e('button', { key: d, onClick: function () { setRestDuration(d); if (!timerRunning) setRemaining(d); }, className: 'text-xs px-1.5 py-0.5 rounded-lg',
            style: d === restDuration ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)' } : { color: 'var(--text-tertiary)' } }, d + 's');
        }),
        timerRunning ? e('button', { onClick: function () { clearTimerInterval(); setTimerRunning(false); }, className: 'text-xs font-medium', style: { color: 'var(--danger)' } }, 'stop')
          : e('button', { onClick: startRestTimer, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, 'start')
      ),
      e(TextInput, { placeholder: 'Notitie (bv. standinstelling machine)', value: note, onChange: function (ev) { setNote(ev.target.value); } })
    )
  );
}

export function SupersetGroup(props) {
  if (props.children.length < 2) return props.children[0];
  return e('div', { className: 'rounded-2xl p-2 flex flex-col gap-2', style: { border: '1.5px dashed var(--amber)' } },
    e('div', { className: 'text-xs font-semibold px-1', style: { color: 'var(--amber)' } }, '🔗 Superset'),
    props.children
  );
}

export function StrengthChartModal(props) {
  var logs = props.strengthLogs.filter(function (l) { return l.exercises.some(function (x) { return x.name === props.name; }); }).sort(function (a, b) { return a.date.localeCompare(b.date); });
  var points = logs.map(function (l) {
    var ex = l.exercises.find(function (x) { return x.name === props.name; });
    var maxW = ex.sets.reduce(function (m, s) { return Math.max(m, s.weight); }, 0);
    return { label: formatDateShort(l.date).split(' ')[0], value: maxW };
  });
  return e(Modal, { title: props.name + ' — gewicht', onClose: props.onClose },
    e(SimpleLineChart, { points: points, color: 'var(--amber)' })
  );
}
