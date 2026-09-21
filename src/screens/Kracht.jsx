/* ---------------- Kracht-tab ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html. */
import React, { useState, useRef } from 'react';
import { SegTabs, Field, TextInput, Button } from '../components/ui.jsx';
import { HRZoneBadge } from '../components/charts.jsx';
import { ExerciseRow, StrengthChartModal, strengthLastLog } from '../components/strength.jsx';
import { Card } from '../components/ui.jsx';
import { uid, todayISO, num, formatDateShort } from '../lib/helpers.js';
import { STRENGTH_TEMPLATES } from '../lib/constants.js';
var e = React.createElement;

export function KrachtTab(props) {
  var templates = Object.keys(STRENGTH_TEMPLATES);
  var st = useState(templates[0]); var template = st[0], setTemplate = st[1];
  var st2 = useState(STRENGTH_TEMPLATES[templates[0]].slice()); var sessionExercises = st2[0], setSessionExercises = st2[1];
  var st3 = useState(''); var newEx = st3[0], setNewEx = st3[1];
  var st4 = useState(''); var hrValue = st4[0], setHrValue = st4[1];
  var st5 = useState(null); var chartExercise = st5[0], setChartExercise = st5[1];
  var sessionRef = useRef({});

  function switchTemplate(t) { setTemplate(t); setSessionExercises(STRENGTH_TEMPLATES[t].slice()); sessionRef.current = {}; }
  function removeExercise(name) { setSessionExercises(function (p) { return p.filter(function (x) { return x !== name; }); }); }
  function moveExercise(idx, dir) { setSessionExercises(function (p) { var n = p.slice(); var j = idx + dir; if (j < 0 || j >= n.length) return p; var tmp = n[idx]; n[idx] = n[j]; n[j] = tmp; return n; }); }

  function lastLogFor(name) { return strengthLastLog(props.state.strengthLogs, name); }
  function saveWorkout() {
    var list = [];
    sessionExercises.forEach(function (name) {
      var data = sessionRef.current[name] || { sets: [], note: '' };
      var sets = (data.sets || []).filter(function (s) { return s.reps !== '' || s.weight !== ''; }).map(function (s) { return { reps: num(s.reps) || 0, weight: num(s.weight) || 0 }; });
      if (sets.length) list.push({ name: name, sets: sets, note: data.note || '' });
    });
    if (!list.length) return;
    props.addStrengthLog({ id: uid(), date: todayISO(), template: template, exercises: list, hr: num(hrValue) });
    switchTemplate(template);
    setHrValue('');
  }
  var recent = props.state.strengthLogs.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 5);
  return e('div', { className: 'flex flex-col gap-4' },
    e('h2', { className: 'font-display text-xl font-semibold text-center' }, 'Krachttraining'),
    e('p', { className: 'text-xs text-center -mt-2', style: { color: 'var(--text-tertiary)' } }, 'Log hier je sets, herhalingen en gewichten. Log je een Leg day/Upper/Full Body training via Schema, dan verschijnt die ook hier.'),
    e(SegTabs, { value: template, onChange: switchTemplate, options: templates.map(function (t) { return { value: t, label: t }; }) }),
    e('div', { className: 'flex flex-col gap-3' },
      sessionExercises.map(function (name, idx) {
        return e(ExerciseRow, { key: template + '-' + name, exercise: name, lastLog: lastLogFor(name), onChange: function (ex, data) { sessionRef.current[ex] = data; }, onRemove: function () { removeExercise(name); },
          onMoveUp: idx > 0 ? function () { moveExercise(idx, -1); } : null, onMoveDown: idx < sessionExercises.length - 1 ? function () { moveExercise(idx, 1); } : null,
          onShowChart: function () { setChartExercise(name); } });
      })
    ),
    e('div', { className: 'flex gap-2' },
      e(TextInput, { placeholder: 'Nieuwe oefening', value: newEx, onChange: function (ev) { setNewEx(ev.target.value); } }),
      e(Button, { variant: 'ghost', onClick: function () { if (!newEx.trim()) return; setSessionExercises(function (p) { return p.concat([newEx.trim()]); }); setNewEx(''); } }, '+ Toevoegen')
    ),
    e(Field, { label: 'Gem. hartslag (bpm)' }, e(TextInput, { type: 'number', value: hrValue, onChange: function (ev) { setHrValue(ev.target.value); } })),
    hrValue ? e(HRZoneBadge, { hr: num(hrValue) }) : null,
    e(Button, { onClick: saveWorkout, className: 'w-full' }, 'Workout opslaan'),
    chartExercise ? e(StrengthChartModal, { name: chartExercise, strengthLogs: props.state.strengthLogs, onClose: function () { setChartExercise(null); } }) : null,
    recent.length ? e('div', { className: 'mt-2' },
      e('div', { className: 'text-sm font-semibold mb-2' }, 'Recente workouts'),
      e('div', { className: 'flex flex-col gap-2' },
        recent.map(function (l) {
          return e(Card, { key: l.id, className: 'p-3' },
            e('div', { className: 'flex items-center justify-between mb-1' },
              e('span', { className: 'text-sm font-medium' }, l.template),
              e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, formatDateShort(l.date))
            ),
            e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, l.exercises.map(function (x) { return x.name + ' (' + x.sets.length + ' sets)'; }).join(' · '))
          );
        })
      )
    ) : null
  );
}
