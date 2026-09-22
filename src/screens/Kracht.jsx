/* ---------------- Kracht-tab ----------------
   Oorspronkelijk 1-op-1 overgenomen uit de originele hybrid-athlete-app.html,
   later uitgebreid met: een optionele warming-up, supersets (oefeningen aan
   elkaar koppelen), zelf schema's kunnen aanmaken/hernoemen/verwijderen (in
   plaats van een vaste lijst), en het automatisch vooraf invullen van de
   vorige sets bij een oefening. */
import React, { useState, useRef, useEffect } from 'react';
import { Field, TextInput, Button, Card, Modal, KebabMenu } from '../components/ui.jsx';
import { HRZoneBadge } from '../components/charts.jsx';
import { ExerciseRow, StrengthChartModal, strengthLastLog, strengthLastSets, groupBySuperset, SupersetGroup } from '../components/strength.jsx';
import { uid, todayISO, num, formatDateShort } from '../lib/helpers.js';
import { WARMUP_TYPES } from '../lib/constants.js';
var e = React.createElement;

function TemplateNameModal(props) {
  var st = useState(props.initialName || ''); var name = st[0], setName = st[1];
  return e(Modal, { title: props.title, onClose: props.onClose },
    e('div', { className: 'flex flex-col gap-3' },
      e(Field, { label: 'Naam schema' }, e(TextInput, { value: name, onChange: function (ev) { setName(ev.target.value); }, placeholder: 'bv. Core' })),
      e(Button, { className: 'w-full', onClick: function () { if (!name.trim()) return; props.onSave(name.trim()); } }, props.confirmLabel)
    )
  );
}

export function KrachtTab(props) {
  var templates = (props.state.strengthTemplates || []).slice().sort(function (a, b) { return a.sortOrder - b.sortOrder; });
  var st = useState(templates.length ? templates[0].id : null); var templateId = st[0], setTemplateId = st[1];
  var currentTemplate = templates.find(function (t) { return t.id === templateId; }) || templates[0] || null;
  var st2 = useState(currentTemplate ? currentTemplate.exercises.slice() : []); var sessionExercises = st2[0], setSessionExercises = st2[1];
  var st3 = useState(''); var newEx = st3[0], setNewEx = st3[1];
  var st4 = useState(''); var hrValue = st4[0], setHrValue = st4[1];
  var st5 = useState(null); var chartExercise = st5[0], setChartExercise = st5[1];
  var stWT = useState(''); var warmupType = stWT[0], setWarmupType = stWT[1];
  var stWM = useState(''); var warmupMinutes = stWM[0], setWarmupMinutes = stWM[1];
  var stModal = useState(null); var nameModal = stModal[0], setNameModal = stModal[1]; // null | 'create' | 'rename'
  var sessionRef = useRef({});
  var stReady = useState(!!currentTemplate); var ready = stReady[0], setReady = stReady[1];

  // Vangnet voor het moment vlak na het (eenmalig, op de achtergrond)
  // aanmaken van de standaardschema's: als deze tab al open was voordat de
  // schema's binnen waren, springt de sessie hier alsnog naar het eerste
  // schema zodra dat beschikbaar komt, i.p.v. blijvend leeg te blijven.
  useEffect(function () {
    if (!ready && currentTemplate) {
      setTemplateId(currentTemplate.id);
      setSessionExercises(currentTemplate.exercises.slice());
      setReady(true);
    }
  }, [currentTemplate ? currentTemplate.id : null]);

  function persist(list, template) {
    var t = template || currentTemplate;
    if (!t) return;
    props.updateStrengthTemplate({ id: t.id, name: t.name, exercises: list, sortOrder: t.sortOrder });
  }
  function switchTemplate(id) {
    var t = templates.find(function (x) { return x.id === id; });
    setTemplateId(id);
    setSessionExercises(t ? t.exercises.slice() : []);
    sessionRef.current = {};
  }
  function removeExercise(name) {
    setSessionExercises(function (p) { var n = p.filter(function (x) { return x.name !== name; }); persist(n); return n; });
  }
  function moveExercise(idx, dir) {
    setSessionExercises(function (p) {
      var n = p.slice(); var j = idx + dir; if (j < 0 || j >= n.length) return p;
      var tmp = n[idx]; n[idx] = n[j]; n[j] = tmp; persist(n); return n;
    });
  }
  function toggleLink(idx) {
    setSessionExercises(function (p) {
      var n = p.slice(); n[idx] = Object.assign({}, n[idx], { linkToNext: !n[idx].linkToNext }); persist(n); return n;
    });
  }
  function addExercise() {
    if (!newEx.trim()) return;
    setSessionExercises(function (p) { var n = p.concat([{ name: newEx.trim(), linkToNext: false }]); persist(n); return n; });
    setNewEx('');
  }
  function createTemplate(name) {
    var t = { id: uid(), name: name, exercises: [], sortOrder: templates.length };
    props.addStrengthTemplate(t);
    setTemplateId(t.id);
    setSessionExercises([]);
    sessionRef.current = {};
    setNameModal(null);
  }
  function renameTemplate(name) {
    if (!currentTemplate) return;
    props.updateStrengthTemplate({ id: currentTemplate.id, name: name, exercises: sessionExercises, sortOrder: currentTemplate.sortOrder });
    setNameModal(null);
  }
  function deleteTemplate() {
    if (!currentTemplate || templates.length <= 1) return;
    var remaining = templates.filter(function (t) { return t.id !== currentTemplate.id; });
    props.deleteStrengthTemplate(currentTemplate.id);
    switchTemplate(remaining[0].id);
  }

  function lastLogFor(name) { return strengthLastLog(props.state.strengthLogs, name); }
  function lastSetsFor(name) { return strengthLastSets(props.state.strengthLogs, name); }
  function saveWorkout() {
    var list = [];
    sessionExercises.forEach(function (item) {
      var name = item.name;
      var data = sessionRef.current[name] || { sets: [], note: '' };
      var sets = (data.sets || []).filter(function (s) { return s.reps !== '' || s.weight !== ''; }).map(function (s) { return { reps: num(s.reps) || 0, weight: num(s.weight) || 0 }; });
      if (sets.length) list.push({ name: name, sets: sets, note: data.note || '' });
    });
    if (!list.length) return;
    props.addStrengthLog({
      id: uid(), date: todayISO(), template: currentTemplate ? currentTemplate.name : '', exercises: list, hr: num(hrValue),
      warmupType: warmupType || null, warmupMinutes: warmupType ? num(warmupMinutes) : null
    });
    switchTemplate(templateId);
    setHrValue('');
    setWarmupType('');
    setWarmupMinutes('');
  }
  var recent = props.state.strengthLogs.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 5);
  var groups = groupBySuperset(sessionExercises);
  var flatIdx = 0;

  return e('div', { className: 'flex flex-col gap-4' },
    e('h2', { className: 'font-display text-xl font-semibold text-center' }, 'Krachttraining'),
    e('p', { className: 'text-xs text-center -mt-2', style: { color: 'var(--text-tertiary)' } }, 'Log hier je sets, herhalingen en gewichten. Log je een Leg day/Upper/Full Body training via Schema, dan verschijnt die ook hier.'),
    e('div', { className: 'flex gap-2 overflow-x-auto scrollbar-none' },
      templates.map(function (t) {
        var active = t.id === templateId;
        return e('button', { key: t.id, onClick: function () { switchTemplate(t.id); }, className: 'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
          style: active ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, t.name);
      }),
      e('button', { onClick: function () { setNameModal('create'); }, className: 'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium', style: { background: 'var(--bg-elevated)', color: 'var(--slate)' } }, '+ Nieuw schema')
    ),
    currentTemplate ? e('div', { className: 'flex items-center justify-end -mt-2' },
      e(KebabMenu, { actions: [
        { label: 'Schema hernoemen', onClick: function () { setNameModal('rename'); } },
        { label: 'Schema verwijderen', danger: true, confirm: true, onClick: deleteTemplate }
      ].filter(function (a) { return a.label !== 'Schema verwijderen' || templates.length > 1; }) })
    ) : null,
    e('div', { className: 'flex flex-col gap-3' },
      groups.map(function (group, gi) {
        var rows = group.map(function (item) {
          var idx = flatIdx; flatIdx++;
          return e(ExerciseRow, {
            key: currentTemplate ? currentTemplate.id + '-' + item.name : item.name, exercise: item.name, lastLog: lastLogFor(item.name), sets: lastSetsFor(item.name),
            onChange: function (ex, data) { sessionRef.current[ex] = data; }, onRemove: function () { removeExercise(item.name); },
            onMoveUp: idx > 0 ? function () { moveExercise(idx, -1); } : null, onMoveDown: idx < sessionExercises.length - 1 ? function () { moveExercise(idx, 1); } : null,
            onToggleLink: idx < sessionExercises.length - 1 ? function () { toggleLink(idx); } : null, linked: sessionExercises[idx] && sessionExercises[idx].linkToNext,
            onShowChart: function () { setChartExercise(item.name); }
          });
        });
        return e(SupersetGroup, { key: gi }, rows);
      })
    ),
    e('div', { className: 'flex gap-2' },
      e(TextInput, { placeholder: 'Nieuwe oefening', value: newEx, onChange: function (ev) { setNewEx(ev.target.value); } }),
      e(Button, { variant: 'ghost', onClick: addExercise }, '+ Toevoegen')
    ),
    e(Card, { className: 'p-3.5' },
      e('div', { className: 'text-sm font-semibold mb-2' }, '🚴 Warming-up (optioneel)'),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Type' }, e('select', { value: warmupType, onChange: function (ev) { setWarmupType(ev.target.value); } },
          [e('option', { key: '', value: '' }, 'Geen')].concat(WARMUP_TYPES.map(function (w) { return e('option', { key: w, value: w }, w); }))
        )),
        e(Field, { label: 'Duur (min)' }, e(TextInput, { type: 'number', value: warmupMinutes, onChange: function (ev) { setWarmupMinutes(ev.target.value); }, disabled: !warmupType }))
      )
    ),
    e(Field, { label: 'Gem. hartslag (bpm)' }, e(TextInput, { type: 'number', value: hrValue, onChange: function (ev) { setHrValue(ev.target.value); } })),
    hrValue ? e(HRZoneBadge, { hr: num(hrValue) }) : null,
    e(Button, { onClick: saveWorkout, className: 'w-full' }, 'Workout opslaan'),
    chartExercise ? e(StrengthChartModal, { name: chartExercise, strengthLogs: props.state.strengthLogs, onClose: function () { setChartExercise(null); } }) : null,
    nameModal === 'create' ? e(TemplateNameModal, { title: 'Nieuw schema', confirmLabel: 'Aanmaken', onClose: function () { setNameModal(null); }, onSave: createTemplate }) : null,
    nameModal === 'rename' ? e(TemplateNameModal, { title: 'Schema hernoemen', confirmLabel: 'Opslaan', initialName: currentTemplate ? currentTemplate.name : '', onClose: function () { setNameModal(null); }, onSave: renameTemplate }) : null,
    recent.length ? e('div', { className: 'mt-2' },
      e('div', { className: 'text-sm font-semibold mb-2' }, 'Recente workouts'),
      e('div', { className: 'flex flex-col gap-2' },
        recent.map(function (l) {
          return e(Card, { key: l.id, className: 'p-3' },
            e('div', { className: 'flex items-center justify-between mb-1' },
              e('span', { className: 'text-sm font-medium' }, l.template),
              e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, formatDateShort(l.date))
            ),
            l.warmupType ? e('div', { className: 'text-xs mb-1', style: { color: 'var(--text-tertiary)' } }, '🚴 Warming-up: ' + (l.warmupMinutes ? l.warmupMinutes + ' min ' : '') + l.warmupType.toLowerCase()) : null,
            e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, l.exercises.map(function (x) { return x.name + ' (' + x.sets.length + ' sets)'; }).join(' · '))
          );
        })
      )
    ) : null
  );
}
