/* ---------------- Kracht-tab ----------------
   Dit is dé plek om krachttraining te loggen. Wat je invult (sets, reps,
   gewichten, hartslag, duur, warming-up) staat in een concept dat door de app
   wordt bewaard (ook op je telefoon zelf), zodat het niet kwijtraakt als je
   naar een andere tab gaat of de app sluit. Pas bij "Workout opslaan" gaat het
   naar de database, en daarna pas wordt het concept gewist. Een set telt pas
   mee als je hem afvinkt. Een bijbehorende training in Schema wordt na het
   opslaan automatisch afgevinkt. */
import React, { useState } from 'react';
import { Field, TextInput, Button, Card, Modal, KebabMenu } from '../components/ui.jsx';
import { HRZoneBadge } from '../components/charts.jsx';
import { ExerciseRow, ExercisePicker, StrengthChartModal, strengthLastLog, strengthLastSets, strengthBestWeight, strengthBestRepsPerWeight, strengthKnownExercises, groupBySuperset, SupersetGroup } from '../components/strength.jsx';
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
  var currentTemplate = templates.find(function (t) { return t.id === props.krachtTemplateId; }) || templates[0] || null;
  var templateId = currentTemplate ? currentTemplate.id : null;
  var exercises = currentTemplate ? currentTemplate.exercises : [];
  var draft = (templateId && props.strengthDrafts && props.strengthDrafts[templateId]) || {};
  var draftData = draft.data || {};
  var date = draft.date || todayISO();

  var st5 = useState(null); var chartExercise = st5[0], setChartExercise = st5[1];
  var stModal = useState(null); var nameModal = stModal[0], setNameModal = stModal[1]; // null | 'create' | 'rename'
  var stSaving = useState(false); var saving = stSaving[0], setSaving = stSaving[1];
  var stMsg = useState(null); var msg = stMsg[0], setMsg = stMsg[1]; // { kind: 'ok' | 'error', text }

  function patchDraft(patch) { if (templateId) props.patchStrengthDraft(templateId, patch); }
  function setField(k) { return function (ev) { var p = {}; p[k] = ev.target.value; patchDraft(p); }; }

  function persist(list) {
    if (!currentTemplate) return;
    props.updateStrengthTemplate({ id: currentTemplate.id, name: currentTemplate.name, exercises: list, sortOrder: currentTemplate.sortOrder });
  }
  function switchTemplate(id) { props.setKrachtTemplateId(id); setMsg(null); }
  function removeExercise(name) { persist(exercises.filter(function (x) { return x.name !== name; })); }
  function moveExercise(idx, dir) {
    var n = exercises.slice(); var j = idx + dir; if (j < 0 || j >= n.length) return;
    var tmp = n[idx]; n[idx] = n[j]; n[j] = tmp; persist(n);
  }
  function toggleLink(idx) {
    var n = exercises.slice(); n[idx] = Object.assign({}, n[idx], { linkToNext: !n[idx].linkToNext }); persist(n);
  }
  function addExercise(name) {
    if (!name || !name.trim()) return;
    persist(exercises.concat([{ name: name.trim(), linkToNext: false }]));
  }
  function createTemplate(name) {
    var t = { id: uid(), name: name, exercises: [], sortOrder: templates.length };
    props.addStrengthTemplate(t);
    props.setKrachtTemplateId(t.id);
    setNameModal(null);
  }
  function renameTemplate(name) {
    if (!currentTemplate) return;
    props.updateStrengthTemplate({ id: currentTemplate.id, name: name, exercises: exercises, sortOrder: currentTemplate.sortOrder });
    setNameModal(null);
  }
  function deleteTemplate() {
    if (!currentTemplate || templates.length <= 1) return;
    var remaining = templates.filter(function (t) { return t.id !== currentTemplate.id; });
    props.deleteStrengthTemplate(currentTemplate.id);
    props.clearStrengthDraft(currentTemplate.id);
    switchTemplate(remaining[0].id);
  }

  function lastLogFor(name) { return strengthLastLog(props.state.strengthLogs, name); }
  function lastSetsFor(name) { return strengthLastSets(props.state.strengthLogs, name); }
  function bestWeightFor(name) { return strengthBestWeight(props.state.strengthLogs, name); }
  function bestRepsFor(name) { return strengthBestRepsPerWeight(props.state.strengthLogs, name); }

  // Welke training in Schema wordt na het opslaan afgevinkt?
  var linkedEntry = null;
  if (currentTemplate) {
    if (draft.entryId) linkedEntry = props.state.scheduleEntries.find(function (x) { return x.id === draft.entryId; }) || null;
    if (!linkedEntry) {
      linkedEntry = props.state.scheduleEntries.find(function (x) { return x.sport === 'Kracht' && !x.completed && x.type === currentTemplate.name && x.date === date; }) || null;
    }
  }

  var doneSetCount = 0;
  exercises.forEach(function (item) {
    var d = draftData[item.name];
    if (d && d.sets) doneSetCount += d.sets.filter(function (s) { return s.done; }).length;
  });

  function saveWorkout() {
    if (!currentTemplate || saving) return;
    var list = [];
    exercises.forEach(function (item) {
      var data = draftData[item.name];
      if (!data || !data.sets) return;
      var sets = data.sets.filter(function (s) { return s.done; }).map(function (s) { return { reps: num(s.reps) || 0, weight: num(s.weight) || 0 }; });
      if (sets.length) list.push({ name: item.name, sets: sets, note: data.note || '' });
    });
    if (!list.length) { setMsg({ kind: 'error', text: 'Vink eerst minstens één set af. Alleen afgevinkte sets worden opgeslagen.' }); return; }
    var logId = draft.logId || uid();
    patchDraft({ logId: logId });
    var wuType = draft.warmupType || '';
    var log = {
      id: logId, date: date, template: currentTemplate.name, exercises: list, hr: num(draft.hr),
      warmupType: wuType || null, warmupMinutes: wuType ? num(draft.warmupMinutes) : null, warmupHr: wuType ? num(draft.warmupHr) : null,
      durationMin: num(draft.durationMin)
    };
    setSaving(true); setMsg(null);
    props.saveStrengthWorkout(log, linkedEntry ? linkedEntry.id : null, templateId).then(function () {
      setSaving(false);
      setMsg({ kind: 'ok', text: 'Workout opgeslagen (' + list.length + ' oefeningen)' + (linkedEntry ? ' en afgevinkt in Schema.' : '.') });
    }).catch(function (err) {
      setSaving(false);
      setMsg({ kind: 'error', text: 'Opslaan is niet gelukt: ' + ((err && err.message) ? err.message : 'onbekende fout') + '. Je ingevulde sets staan nog hier, probeer het opnieuw.' });
    });
  }

  var recent = props.state.strengthLogs.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 5);
  var groups = groupBySuperset(exercises);
  var flatIdx = 0;
  var known = strengthKnownExercises(props.state.strengthLogs, templates);
  var wuType2 = draft.warmupType || '';

  return e('div', { className: 'flex flex-col gap-4' },
    e('h2', { className: 'font-display text-xl font-semibold text-center' }, 'Krachttraining'),
    e('p', { className: 'text-xs text-center -mt-2', style: { color: 'var(--text-tertiary)' } }, 'Log je krachttraining altijd hier. Alles wat je invult blijft bewaard tot je op "Workout opslaan" tikt. Vink elke set af als je hem hebt gedaan.'),
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
    currentTemplate ? e(Card, { className: 'p-3.5 flex flex-col gap-2' },
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Datum van de training' }, e(TextInput, { type: 'date', value: date, onChange: function (ev) { if (ev.target.value) patchDraft({ date: ev.target.value, entryId: null }); } }))
      ),
      linkedEntry
        ? e('div', { className: 'text-xs', style: { color: 'var(--sage-strong)' } }, '✓ Na opslaan wordt "' + linkedEntry.type + '" in Schema (' + formatDateShort(linkedEntry.date) + ') automatisch afgevinkt.')
        : e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Op deze dag staat geen openstaande "' + currentTemplate.name + '" in Schema. De workout wordt alleen hier opgeslagen.')
    ) : null,
    e('div', { className: 'flex flex-col gap-3' },
      groups.map(function (group, gi) {
        var rows = group.map(function (item) {
          var idx = flatIdx; flatIdx++;
          return e(ExerciseRow, {
            key: currentTemplate.id + '-' + item.name, exercise: item.name, lastLog: lastLogFor(item.name), suggested: lastSetsFor(item.name), best: bestWeightFor(item.name), bestReps: bestRepsFor(item.name),
            data: draftData[item.name],
            onChange: function (ex, data) { var d = Object.assign({}, draftData); d[ex] = data; patchDraft({ data: d }); },
            onRemove: function () { removeExercise(item.name); },
            onMoveUp: idx > 0 ? function () { moveExercise(idx, -1); } : null, onMoveDown: idx < exercises.length - 1 ? function () { moveExercise(idx, 1); } : null,
            onToggleLink: idx < exercises.length - 1 ? function () { toggleLink(idx); } : null, linked: exercises[idx] && exercises[idx].linkToNext,
            onShowChart: function () { setChartExercise(item.name); }
          });
        });
        return e(SupersetGroup, { key: gi }, rows);
      })
    ),
    currentTemplate ? e(ExercisePicker, { known: known, exclude: exercises.map(function (x) { return x.name; }), strengthLogs: props.state.strengthLogs, onAdd: addExercise }) : null,
    e(Card, { className: 'p-3.5' },
      e('div', { className: 'text-sm font-semibold mb-2' }, '🚴 Warming-up (optioneel)'),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Type' }, e('select', { value: wuType2, onChange: setField('warmupType') },
          [e('option', { key: '', value: '' }, 'Geen')].concat(WARMUP_TYPES.map(function (w) { return e('option', { key: w, value: w }, w); }))
        )),
        e(Field, { label: 'Duur WU (min)' }, e(TextInput, { type: 'number', value: draft.warmupMinutes != null ? draft.warmupMinutes : '', onChange: setField('warmupMinutes'), disabled: !wuType2 }))
      ),
      e('div', { className: 'mt-3' },
        e(Field, { label: 'Gem. hartslag WU (bpm)' }, e(TextInput, { type: 'number', value: draft.warmupHr != null ? draft.warmupHr : '', onChange: setField('warmupHr'), disabled: !wuType2 }))
      ),
      wuType2 && draft.warmupHr ? e('div', { className: 'mt-2' }, e(HRZoneBadge, { hr: num(draft.warmupHr) })) : null,
      wuType2 ? e('p', { className: 'text-xs mt-2', style: { color: 'var(--text-tertiary)' } }, 'De warming-up telt mee in je trainingslast, op basis van deze duur en hartslag. Zonder WU-hartslag telt hij niet mee.') : null
    ),
    e('div', { className: 'text-sm font-semibold -mb-2' }, '🏋️ Krachtsessie zelf'),
    e('div', { className: 'grid grid-cols-2 gap-3' },
      e(Field, { label: 'Gem. hartslag training (bpm)' }, e(TextInput, { type: 'number', value: draft.hr != null ? draft.hr : '', onChange: setField('hr') })),
      e(Field, { label: 'Duur training (min, zonder WU)' }, e(TextInput, { type: 'number', value: draft.durationMin != null ? draft.durationMin : '', onChange: setField('durationMin') }))
    ),
    draft.hr ? e(HRZoneBadge, { hr: num(draft.hr) }) : null,
    msg ? e('div', { className: 'rounded-xl px-3 py-2.5 text-xs font-semibold', style: msg.kind === 'ok' ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { background: 'var(--danger-bg)', color: 'var(--danger)' } }, msg.text) : null,
    e(Button, { onClick: saveWorkout, disabled: saving, className: 'w-full' }, saving ? 'Opslaan…' : 'Workout opslaan (' + doneSetCount + ' ' + (doneSetCount === 1 ? 'set' : 'sets') + ' afgevinkt)'),
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
            l.warmupType ? e('div', { className: 'text-xs mb-1', style: { color: 'var(--text-tertiary)' } }, '🚴 Warming-up: ' + (l.warmupMinutes ? l.warmupMinutes + ' min ' : '') + l.warmupType.toLowerCase() + (l.warmupHr ? ' · ' + l.warmupHr + ' bpm' : '')) : null,
            e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, l.exercises.map(function (x) { return x.name + ' (' + x.sets.length + ' sets)'; }).join(' · '))
          );
        })
      )
    ) : null
  );
}
