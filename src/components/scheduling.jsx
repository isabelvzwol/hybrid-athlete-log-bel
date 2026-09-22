/* ---------------- schema/trainingslog-onderdelen ----------------
   Gedeeld tussen Home en Schema. 1-op-1 overgenomen uit de originele
   hybrid-athlete-app.html. */
import React, { useState } from 'react';
import { Card, Badge, Button, Field, TextInput, Modal, KebabMenu, ConfirmInline } from './ui.jsx';
import { HRZoneBadge } from './charts.jsx';
import { ExerciseRow, StrengthChartModal, strengthLastLog, strengthLastSets, strengthBestWeight, strengthBestRepsPerWeight, groupBySuperset, SupersetGroup } from './strength.jsx';
import { WorkoutBlocks } from './hyroxShared.jsx';
import { computePreview } from '../lib/domain.js';
import { uid, num, addDays, formatDateShort, getMonday, todayISO, WEEKDAYS_FULL, toDate, parseDuration, formatDuration } from '../lib/helpers.js';
import { SPORT_ICON, SPORT_OPTIONS, WARMUP_TYPES } from '../lib/constants.js';
var e = React.createElement;

export function DayCard(props) {
  var entry = props.entry;
  var icon = SPORT_ICON[entry.sport] || '•';
  return e(Card, {
    onClick: function () { props.onOpen(entry); },
    className: 'p-3.5 flex items-center gap-3 cursor-pointer'
  },
    e('div', { className: 'w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0', style: { background: entry.completed ? 'var(--sage-bg)' : 'var(--bg-elevated)' } }, icon),
    e('div', { className: 'flex-1 min-w-0' },
      e('div', { className: 'flex items-center gap-2' },
        e('span', { className: 'text-sm font-semibold' }, entry.type),
        entry.sport === 'Brick' ? e(Badge, { tone: 'slate' }, 'brick') : null
      ),
      e('div', { className: 'text-xs truncate', style: { color: 'var(--text-secondary)' } }, entry.plannedText || '—'),
      entry.distance ? e('div', { className: 'text-xs mt-0.5', style: { color: 'var(--text-tertiary)' } }, entry.distance + ' km' + (entry.pace ? ' · ' + entry.pace + '/km' : '')) : null
    ),
    e('div', { className: 'w-7 h-7 rounded-full flex items-center justify-center shrink-0', style: entry.completed ? { background: 'var(--sage)', color: '#12180F' } : { border: '1.5px solid var(--border)', color: 'var(--text-tertiary)' } }, entry.completed ? '✓' : '')
  );
}
export function RestDayCard(props) {
  return e(Card, { className: 'p-3.5 flex items-center gap-3', onClick: props.onAdd },
    e('div', { className: 'w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0', style: { background: 'var(--bg-elevated)' } }, '🌙'),
    e('div', { className: 'flex-1' },
      e('div', { className: 'text-sm font-semibold', style: { color: 'var(--text-secondary)' } }, 'Rustdag'),
      e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Geen training gepland')
    ),
    e('button', { className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, '+ toevoegen')
  );
}

export function EditEntryForm(props) {
  var entry = props.entry;
  var st = useState({ date: entry.date, weekLabel: entry.weekLabel || '', sport: entry.sport, type: entry.type, plannedText: entry.plannedText || '', distance: entry.distance != null ? entry.distance : '', pace: entry.pace || '' });
  var f = st[0], setF = st[1];
  function set(k) { return function (ev) { var v = ev.target.value; setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }; }
  return e('div', { className: 'flex flex-col gap-3' },
    e('div', { className: 'grid grid-cols-2 gap-3' },
      e(Field, { label: 'Datum' }, e(TextInput, { type: 'date', value: f.date, onChange: set('date') })),
      e(Field, { label: 'Weeklabel' }, e(TextInput, { value: f.weekLabel, onChange: set('weekLabel') }))
    ),
    e('div', { className: 'grid grid-cols-2 gap-3' },
      e(Field, { label: 'Sport' }, e('select', { value: f.sport, onChange: set('sport') },
        SPORT_OPTIONS.map(function (s) { return e('option', { key: s, value: s }, s); })
      )),
      e(Field, { label: 'Type training' }, e(TextInput, { value: f.type, onChange: set('type') }))
    ),
    e(Field, { label: 'Invulling & tempo' }, e('textarea', { rows: 2, value: f.plannedText, onChange: set('plannedText') })),
    e('div', { className: 'grid grid-cols-2 gap-3' },
      e(Field, { label: 'Kilometer (optioneel)' }, e(TextInput, { type: 'number', value: f.distance, onChange: set('distance') })),
      e(Field, { label: 'Tempo (optioneel)' }, e(TextInput, { value: f.pace, onChange: set('pace') }))
    ),
    e('div', { className: 'flex gap-2 mt-1' },
      e(Button, { className: 'flex-1', onClick: function () {
        if (!f.date || !f.type) return;
        props.onSave({ date: f.date, weekLabel: f.weekLabel, sport: f.sport, type: f.type, plannedText: f.plannedText, distance: num(f.distance), pace: f.pace });
      } }, 'Opslaan'),
      e(Button, { variant: 'ghost', onClick: props.onCancel }, 'Annuleer')
    )
  );
}

export function AddScheduleEntryModal(props) {
  var st = useState({ date: props.defaultDate || todayISO(), weekLabel: '', sport: 'Hardlopen', type: '', plannedText: '', distance: '', pace: '', repeatWeeks: '1' });
  var f = st[0], setF = st[1];
  function set(k) { return function (ev) { var v = ev.target.value; setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }; }
  return e(Modal, { title: 'Training toevoegen', onClose: props.onClose },
    e('div', { className: 'flex flex-col gap-3' },
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Datum' }, e(TextInput, { type: 'date', value: f.date, onChange: set('date') })),
        e(Field, { label: 'Weeklabel' }, e(TextInput, { value: f.weekLabel, onChange: set('weekLabel'), placeholder: 'bv. Week 15' }))
      ),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Sport' }, e('select', { value: f.sport, onChange: set('sport') },
          SPORT_OPTIONS.map(function (s) { return e('option', { key: s, value: s }, s); })
        )),
        e(Field, { label: 'Type training' }, e(TextInput, { value: f.type, onChange: set('type'), placeholder: 'bv. Long run' }))
      ),
      e(Field, { label: 'Invulling & tempo' }, e('textarea', { rows: 2, value: f.plannedText, onChange: set('plannedText'), placeholder: 'bv. 2k @5:50, 8k @4:40, 1k @5:30' })),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Kilometer (optioneel)' }, e(TextInput, { type: 'number', value: f.distance, onChange: set('distance') })),
        e(Field, { label: 'Tempo (optioneel)' }, e(TextInput, { value: f.pace, onChange: set('pace'), placeholder: 'bv. 5:00' }))
      ),
      e(Field, { label: 'Herhalen: elke week op deze dag, voor hoeveel weken?' }, e(TextInput, { type: 'number', value: f.repeatWeeks, onChange: set('repeatWeeks'), placeholder: '1 = niet herhalen' })),
      e(Button, { className: 'w-full mt-1', onClick: function () {
        if (!f.date || !f.type) return;
        var weeks = Math.max(1, Math.min(52, parseInt(f.repeatWeeks) || 1));
        for (var i = 0; i < weeks; i++) {
          props.onAdd({ id: uid(), date: addDays(f.date, i * 7), weekLabel: i === 0 ? (f.weekLabel || ('Week van ' + formatDateShort(getMonday(f.date)))) : '', sport: f.sport, type: f.type,
            plannedText: f.plannedText, distance: num(f.distance), pace: f.pace, hr: null, completed: false, actual: null });
        }
      } }, 'Training toevoegen')
    )
  );
}

export function LogTrainingModal(props) {
  var entry = props.entry;
  var isBrick = entry.sport === 'Brick';
  var isKracht = entry.sport === 'Kracht';
  var isZwemmen = entry.sport === 'Zwemmen';
  var isWielrennen = entry.sport === 'Wielrennen / Kickr';
  var isHardlopen = entry.sport === 'Hardlopen';
  var isHyrox = entry.sport === 'Hyrox';
  var krachtTemplate = isKracht ? (props.strengthTemplates || []).find(function (t) { return t.name === entry.type; }) : null;
  var a = entry.actual || {};
  var stHyroxWorkout = useState(a.workoutId || ''); var hyroxWorkoutId = stHyroxWorkout[0], setHyroxWorkoutId = stHyroxWorkout[1];
  var stEditingPlan = useState(false); var editingPlan = stEditingPlan[0], setEditingPlan = stEditingPlan[1];
  var stMoving = useState(false); var movingDate = stMoving[0], setMovingDate = stMoving[1];
  var stMoveDate = useState(entry.date); var moveDate = stMoveDate[0], setMoveDate = stMoveDate[1];
  var stChartEx = useState(null); var chartExercise = stChartEx[0], setChartExercise = stChartEx[1];
  var stKrachtEx = useState(krachtTemplate ? krachtTemplate.exercises.slice() : []); var krachtExercises = stKrachtEx[0], setKrachtExercises = stKrachtEx[1];
  var stKrachtNew = useState(''); var krachtNewEx = stKrachtNew[0], setKrachtNewEx = stKrachtNew[1];
  var stWarmupType = useState(''); var warmupType = stWarmupType[0], setWarmupType = stWarmupType[1];
  var stWarmupMin = useState(''); var warmupMinutes = stWarmupMin[0], setWarmupMinutes = stWarmupMin[1];
  var krachtSessionRef = React.useRef({});
  function removeKrachtExercise(name) { setKrachtExercises(function (p) { return p.filter(function (x) { return x.name !== name; }); }); }
  function moveKrachtExercise(idx, dir) { setKrachtExercises(function (p) { var n = p.slice(); var j = idx + dir; if (j < 0 || j >= n.length) return p; var tmp = n[idx]; n[idx] = n[j]; n[j] = tmp; return n; }); }
  function toggleKrachtLink(idx) { setKrachtExercises(function (p) { var n = p.slice(); n[idx] = Object.assign({}, n[idx], { linkToNext: !n[idx].linkToNext }); return n; }); }
  var st = useState({
    distance: a.distance != null ? a.distance : (entry.distance != null ? entry.distance : ''),
    time: a.time || '',
    pace: a.pace || entry.pace || '',
    hr: a.hr != null ? a.hr : (entry.hr != null ? entry.hr : ''),
    note: a.note || '',
    power: a.power != null ? a.power : '',
    cadence: a.cadence != null ? a.cadence : '',
    rideType: a.rideType || 'binnen',
    runType: a.runType || 'tempo',
    bikeDistance: (a.bike && a.bike.distance != null) ? a.bike.distance : '',
    bikeTime: (a.bike && a.bike.time) ? a.bike.time : '',
    bikeHr: (a.bike && a.bike.hr != null) ? a.bike.hr : '',
    runDistance: (a.run && a.run.distance != null) ? a.run.distance : '',
    runTime: (a.run && a.run.time) ? a.run.time : '',
    runHr: (a.run && a.run.hr != null) ? a.run.hr : ''
  });
  var f = st[0], setF = st[1];
  function set(k) { return function (ev) { var v = ev.target.value; setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }; }
  var preview = (isZwemmen || isWielrennen || isHardlopen) ? computePreview(entry.sport, f) : null;
  function save() {
    var actual;
    if (isBrick) {
      actual = {
        bike: { distance: num(f.bikeDistance), time: f.bikeTime, hr: num(f.bikeHr) },
        run: { distance: num(f.runDistance), time: f.runTime, hr: num(f.runHr) },
        note: f.note
      };
    } else if (isKracht) {
      if (krachtTemplate) {
        var list = [];
        krachtExercises.forEach(function (item) {
          var name = item.name;
          var data = krachtSessionRef.current[name] || { sets: [], note: '' };
          var sets = (data.sets || []).filter(function (s) { return s.reps !== '' || s.weight !== ''; }).map(function (s) { return { reps: num(s.reps) || 0, weight: num(s.weight) || 0 }; });
          if (sets.length) list.push({ name: name, sets: sets, note: data.note || '' });
        });
        if (list.length) props.onSaveStrengthLog({ id: uid(), date: entry.date, template: entry.type, exercises: list, hr: num(f.hr), warmupType: warmupType || null, warmupMinutes: warmupType ? num(warmupMinutes) : null });
      }
      actual = { note: f.note, hr: num(f.hr) };
    } else if (isHyrox) {
      if (hyroxWorkoutId && f.time) props.onSaveHyroxLog({ id: uid(), workoutId: hyroxWorkoutId, date: entry.date, time: f.time, note: f.note, hr: num(f.hr) });
      actual = { workoutId: hyroxWorkoutId, time: f.time, note: f.note, hr: num(f.hr) };
    } else if (isZwemmen) {
      actual = { distance: num(f.distance), time: f.time, hr: num(f.hr), pace100: (parseDuration(f.time) && num(f.distance)) ? formatDuration((parseDuration(f.time) / num(f.distance)) * 100) : null, note: f.note };
    } else if (isWielrennen) {
      actual = { distance: num(f.distance), time: f.time, power: num(f.power), cadence: num(f.cadence), hr: num(f.hr), rideType: f.rideType, speed: (parseDuration(f.time) && num(f.distance)) ? (num(f.distance) / (parseDuration(f.time) / 3600)).toFixed(1) : null, note: f.note };
    } else if (isHardlopen) {
      actual = { distance: num(f.distance), time: f.time, hr: num(f.hr), runType: f.runType, pace: (parseDuration(f.time) && num(f.distance)) ? formatDuration(parseDuration(f.time) / num(f.distance)) : null, note: f.note };
    } else {
      actual = { distance: num(f.distance), time: f.time, pace: f.pace, hr: num(f.hr), note: f.note };
    }
    props.onSave(entry.id, actual);
  }
  if (editingPlan) {
    return e(Modal, { title: 'Training bewerken', onClose: props.onClose },
      e(EditEntryForm, { entry: entry, onCancel: function () { setEditingPlan(false); }, onSave: function (patch) { props.onUpdateEntry(entry.id, patch); setEditingPlan(false); } })
    );
  }
  if (movingDate) {
    return e(Modal, { title: 'Verplaatsen naar andere dag', onClose: props.onClose },
      e('div', { className: 'flex flex-col gap-3' },
        e(Field, { label: 'Nieuwe datum' }, e(TextInput, { type: 'date', value: moveDate, onChange: function (ev) { setMoveDate(ev.target.value); } })),
        e('div', { className: 'flex gap-2' },
          e(Button, { className: 'flex-1', onClick: function () { props.onUpdateEntry(entry.id, { date: moveDate }); props.onClose(); } }, 'Verplaatsen'),
          e(Button, { variant: 'ghost', onClick: function () { setMovingDate(false); } }, 'Annuleer')
        )
      )
    );
  }
  return e(Modal, { title: 'Training loggen', onClose: props.onClose },
    e('div', { className: 'flex items-center justify-between mb-4' },
      e('div', { className: 'flex items-center gap-2' },
        e(Badge, { tone: 'slate' }, (SPORT_ICON[entry.sport] || '•') + ' ' + entry.sport),
        e('span', { className: 'text-sm', style: { color: 'var(--text-secondary)' } }, entry.type)
      ),
      e(KebabMenu, { actions: [
        { label: 'Training bewerken', onClick: function () { setEditingPlan(true); } },
        { label: 'Verplaatsen naar andere dag', onClick: function () { setMoveDate(entry.date); setMovingDate(true); } },
        { label: 'Training verwijderen', danger: true, confirm: true, onClick: function () { props.onDeleteEntry(entry.id); props.onClose(); } }
      ] })
    ),
    e('p', { className: 'text-xs mb-4', style: { color: 'var(--text-tertiary)' } }, entry.plannedText || 'Geen omschrijving'),
    isKracht && krachtTemplate ? e('div', { className: 'flex flex-col gap-3' },
      e('p', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Dit wordt ook opgeslagen bij Krachttraining.'),
      (function () {
        var groups = groupBySuperset(krachtExercises);
        var flatIdx = 0;
        return groups.map(function (group, gi) {
          var rows = group.map(function (item) {
            var idx = flatIdx; flatIdx++;
            return e(ExerciseRow, {
              key: item.name, exercise: item.name, lastLog: strengthLastLog(props.strengthLogs, item.name), sets: strengthLastSets(props.strengthLogs, item.name), best: strengthBestWeight(props.strengthLogs, item.name), bestReps: strengthBestRepsPerWeight(props.strengthLogs, item.name),
              onChange: function (ex, data) { krachtSessionRef.current[ex] = data; }, onRemove: function () { removeKrachtExercise(item.name); },
              onMoveUp: idx > 0 ? function () { moveKrachtExercise(idx, -1); } : null, onMoveDown: idx < krachtExercises.length - 1 ? function () { moveKrachtExercise(idx, 1); } : null,
              onToggleLink: idx < krachtExercises.length - 1 ? function () { toggleKrachtLink(idx); } : null, linked: krachtExercises[idx] && krachtExercises[idx].linkToNext,
              onShowChart: function () { setChartExercise(item.name); }
            });
          });
          return e(SupersetGroup, { key: gi }, rows);
        });
      })(),
      e('div', { className: 'flex gap-2' },
        e(TextInput, { placeholder: 'Nieuwe oefening', value: krachtNewEx, onChange: function (ev) { setKrachtNewEx(ev.target.value); } }),
        e(Button, { variant: 'ghost', onClick: function () { if (!krachtNewEx.trim()) return; setKrachtExercises(function (p) { return p.concat([{ name: krachtNewEx.trim(), linkToNext: false }]); }); setKrachtNewEx(''); } }, '+ Toevoegen')
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
      e(Field, { label: 'Gem. hartslag (bpm)' }, e(TextInput, { type: 'number', value: f.hr, onChange: set('hr') })),
      f.hr ? e(HRZoneBadge, { hr: num(f.hr) }) : null,
      e(Field, { label: 'Notitie / gevoel (algemeen)' }, e('textarea', { rows: 2, value: f.note, onChange: set('note') }))
    ) : isKracht ? e('div', { className: 'flex flex-col gap-3' },
      e('p', { className: 'text-sm', style: { color: 'var(--text-secondary)' } }, 'Log de sets, herhalingen en gewichten in de Kracht-tab. Hier vink je alleen af dat je de sessie hebt gedaan.'),
      e(Field, { label: 'Gem. hartslag (bpm)' }, e(TextInput, { type: 'number', value: f.hr, onChange: set('hr') })),
      f.hr ? e(HRZoneBadge, { hr: num(f.hr) }) : null,
      e(Field, { label: 'Notitie / gevoel' }, e('textarea', { rows: 2, value: f.note, onChange: set('note') }))
    ) : isHyrox ? e('div', { className: 'flex flex-col gap-3' },
      e('p', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Dit wordt ook opgeslagen bij Hyrox.'),
      e(Field, { label: 'Workout' }, e('select', { value: hyroxWorkoutId, onChange: function (ev) { setHyroxWorkoutId(ev.target.value); } },
        [e('option', { key: '', value: '' }, 'Kies een workout')].concat((props.hyroxLibrary || []).map(function (w) { return e('option', { key: w.id, value: w.id }, w.name); }))
      )),
      (function () { var w = (props.hyroxLibrary || []).find(function (x) { return x.id === hyroxWorkoutId; }); return w ? e(WorkoutBlocks, { blocks: w.blocks || [] }) : null; })(),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Tijd (mm:ss)' }, e(TextInput, { placeholder: '12:45', value: f.time, onChange: set('time') })),
        e(Field, { label: 'Gem. hartslag (bpm)' }, e(TextInput, { type: 'number', value: f.hr, onChange: set('hr') }))
      ),
      f.hr ? e(HRZoneBadge, { hr: num(f.hr) }) : null,
      e(Field, { label: 'Notitie' }, e(TextInput, { value: f.note, onChange: set('note') }))
    ) : isBrick ? e('div', { className: 'flex flex-col gap-4' },
      e('div', {},
        e('div', { className: 'text-sm font-semibold mb-2' }, '🚴 Fiets'),
        e('div', { className: 'grid grid-cols-3 gap-2' },
          e(Field, { label: 'Km' }, e(TextInput, { type: 'number', value: f.bikeDistance, onChange: set('bikeDistance') })),
          e(Field, { label: 'Tijd' }, e(TextInput, { placeholder: 'hh:mm:ss', value: f.bikeTime, onChange: set('bikeTime') })),
          e(Field, { label: 'HR' }, e(TextInput, { type: 'number', value: f.bikeHr, onChange: set('bikeHr') }))
        )
      ),
      e('div', {},
        e('div', { className: 'text-sm font-semibold mb-2' }, '🏃 Loop'),
        e('div', { className: 'grid grid-cols-3 gap-2' },
          e(Field, { label: 'Km' }, e(TextInput, { type: 'number', value: f.runDistance, onChange: set('runDistance') })),
          e(Field, { label: 'Tijd' }, e(TextInput, { placeholder: 'hh:mm:ss', value: f.runTime, onChange: set('runTime') })),
          e(Field, { label: 'HR' }, e(TextInput, { type: 'number', value: f.runHr, onChange: set('runHr') }))
        )
      ),
      e(Field, { label: 'Notitie / gevoel' }, e('textarea', { rows: 2, value: f.note, onChange: set('note') }))
    ) : isZwemmen ? e('div', { className: 'flex flex-col gap-3' },
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Totale afstand (m)' }, e(TextInput, { type: 'number', value: f.distance, onChange: set('distance') })),
        e(Field, { label: 'Totale tijd (mm:ss)' }, e(TextInput, { placeholder: '32:00', value: f.time, onChange: set('time') }))
      ),
      e(Field, { label: 'Gem. hartslag (bpm)' }, e(TextInput, { type: 'number', value: f.hr, onChange: set('hr') })),
      f.hr ? e(HRZoneBadge, { hr: num(f.hr) }) : null,
      e(Field, { label: 'Notitie / intervalset' }, e('textarea', { rows: 2, value: f.note, onChange: set('note') })),
      preview ? e(Badge, { tone: 'sage' }, preview) : null
    ) : isWielrennen ? e('div', { className: 'flex flex-col gap-3' },
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Afstand (km)' }, e(TextInput, { type: 'number', value: f.distance, onChange: set('distance') })),
        e(Field, { label: 'Tijd (hh:mm)' }, e(TextInput, { placeholder: '1:15', value: f.time, onChange: set('time') }))
      ),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Gem. vermogen (W)' }, e(TextInput, { type: 'number', value: f.power, onChange: set('power') })),
        e(Field, { label: 'Gem. cadans (RPM)' }, e(TextInput, { type: 'number', value: f.cadence, onChange: set('cadence') }))
      ),
      e(Field, { label: 'Gem. hartslag (bpm)' }, e(TextInput, { type: 'number', value: f.hr, onChange: set('hr') })),
      f.hr ? e(HRZoneBadge, { hr: num(f.hr) }) : null,
      e(Field, { label: 'Type rit' }, e('select', { value: f.rideType, onChange: set('rideType') }, ['binnen', 'buiten'].map(function (x) { return e('option', { key: x, value: x }, x); }))),
      e(Field, { label: 'Notitie' }, e('textarea', { rows: 2, value: f.note, onChange: set('note') })),
      preview ? e(Badge, { tone: 'sage' }, preview) : null
    ) : isHardlopen ? e('div', { className: 'flex flex-col gap-3' },
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Afstand (km)' }, e(TextInput, { type: 'number', value: f.distance, onChange: set('distance') })),
        e(Field, { label: 'Tijd (hh:mm:ss)' }, e(TextInput, { placeholder: '0:45:00', value: f.time, onChange: set('time') }))
      ),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Gem. hartslag' }, e(TextInput, { type: 'number', value: f.hr, onChange: set('hr') })),
        e(Field, { label: 'Type run' }, e('select', { value: f.runType, onChange: set('runType') }, ['tempo', 'interval', 'long run', 'herstel'].map(function (x) { return e('option', { key: x, value: x }, x); })))
      ),
      f.hr ? e(HRZoneBadge, { hr: num(f.hr) }) : null,
      e(Field, { label: 'Notitie / gevoel' }, e('textarea', { rows: 2, value: f.note, onChange: set('note') })),
      preview ? e(Badge, { tone: 'sage' }, preview) : null
    ) : e('div', { className: 'flex flex-col gap-3' },
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Afstand (km)' }, e(TextInput, { type: 'number', value: f.distance, onChange: set('distance') })),
        e(Field, { label: 'Tijd (hh:mm:ss)' }, e(TextInput, { placeholder: 'optioneel', value: f.time, onChange: set('time') }))
      ),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Tempo (min/km)' }, e(TextInput, { placeholder: 'bv. 5:20', value: f.pace, onChange: set('pace') })),
        e(Field, { label: 'Gem. hartslag (bpm)' }, e(TextInput, { type: 'number', value: f.hr, onChange: set('hr') }))
      ),
      f.hr ? e(HRZoneBadge, { hr: num(f.hr) }) : null,
      e(Field, { label: 'Notitie / gevoel' }, e('textarea', { rows: 2, value: f.note, onChange: set('note') }))
    ),
    e('div', { className: 'flex gap-2 mt-4' },
      e(Button, { onClick: save, className: 'flex-1' }, 'Markeer als uitgevoerd'),
      entry.completed ? e(ConfirmInline, { label: 'Verwijder log', onConfirm: function () { props.onUncomplete(entry.id); props.onClose(); } }) : null
    ),
    chartExercise ? e(StrengthChartModal, { name: chartExercise, strengthLogs: props.strengthLogs || [], onClose: function () { setChartExercise(null); } }) : null
  );
}

export function WeekBlock(props) {
  var days = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return addDays(props.monday, i); });
  var rows = [];
  days.forEach(function (dateIso) {
    var dayEntries = props.entries.filter(function (x) { return x.date === dateIso; });
    var count = Math.max(dayEntries.length, 1);
    for (var i = 0; i < count; i++) { rows.push({ dateIso: dateIso, isFirst: i === 0, rowSpan: count, entry: dayEntries[i] || null }); }
  });
  var isCurrentWeek = props.monday === getMonday(todayISO());
  return e('div', { className: 'rounded-2xl overflow-hidden mb-4', style: { border: '1px solid var(--border-soft)' } },
    e('div', { className: 'px-3.5 py-2.5 flex items-center justify-between', style: { background: isCurrentWeek ? 'var(--sage-bg)' : 'var(--bg-elevated)' } },
      e('span', { className: 'text-sm font-semibold', style: isCurrentWeek ? { color: 'var(--sage-strong)' } : {} }, props.weekLabel),
      e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, formatDateShort(props.monday) + '–' + formatDateShort(addDays(props.monday, 6)))
    ),
    e('table', { className: 'w-full text-sm' },
      e('tbody', {}, rows.map(function (r, idx) {
        var isToday = r.dateIso === todayISO();
        return e('tr', { key: idx, style: { borderTop: idx > 0 ? '1px solid var(--border-soft)' : 'none', background: isToday ? 'var(--sage-bg)' : 'transparent', cursor: 'pointer' },
          onClick: function () { if (r.entry) props.onOpenEntry(r.entry); else props.onAddFor(r.dateIso); } },
          r.isFirst ? e('td', { rowSpan: r.rowSpan, className: 'px-3.5 py-2.5 align-top text-xs font-medium leading-tight', style: { color: isToday ? 'var(--sage-strong)' : 'var(--text-secondary)', width: '96px' } },
            e('div', { className: 'flex items-start gap-1.5' },
              e('span', {}, WEEKDAYS_FULL[toDate(r.dateIso).getDay()].charAt(0).toUpperCase() + WEEKDAYS_FULL[toDate(r.dateIso).getDay()].slice(1) + ' ' + toDate(r.dateIso).getDate()),
              e('button', { onClick: function (ev) { ev.stopPropagation(); props.onAddFor(r.dateIso); }, style: { color: 'var(--slate)' }, className: 'text-sm leading-none' }, '+')
            )
          ) : null,
          e('td', { className: 'px-3.5 py-2.5' },
            r.entry ? e('div', { className: 'flex items-center gap-2' },
              e('span', {}, SPORT_ICON[r.entry.sport] || '•'),
              e('span', { className: 'flex-1' }, r.entry.type + (r.entry.plannedText && r.entry.plannedText !== r.entry.type ? (': ' + r.entry.plannedText) : '')),
              r.entry.completed ? e('span', { className: 'w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0', style: { background: 'var(--sage)', color: '#12180F' } }, '✓') : null
            ) : e('span', { style: { color: 'var(--text-tertiary)' } }, 'Rust')
          )
        );
      }))
    )
  );
}
